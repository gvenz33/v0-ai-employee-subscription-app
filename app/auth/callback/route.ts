import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      // Check if profile exists
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single()

      if (!existingProfile) {
        // Create profile
        const fullName = user.user_metadata?.full_name || ""
        const referralCode = user.user_metadata?.referral_code

        await supabaseAdmin.from("profiles").insert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          subscription_tier: "personal",
          tasks_limit: 100
        })

        // Generate unique affiliate code for new user
        const newReferralCode = `REF${user.id.slice(0, 8).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
        
        await supabaseAdmin.from("affiliates").insert({
          user_id: user.id,
          referral_code: newReferralCode,
          commission_rate: 10 // Personal tier rate
        })

        // Handle referral tracking if user signed up with a referral code
        if (referralCode) {
          const { data: referrer } = await supabaseAdmin
            .from("affiliates")
            .select("id, user_id, commission_rate, total_referrals")
            .eq("referral_code", referralCode)
            .single()

          if (referrer) {
            // Create referral record
            await supabaseAdmin.from("referrals").insert({
              affiliate_id: referrer.id,
              referred_user_id: user.id,
              subscription_tier: "personal",
              commission_cents: 0, // Will be updated when they subscribe
              status: "pending"
            })

            // Update referrer's total referrals
            const newTotal = (referrer.total_referrals || 0) + 1
            let newRate = referrer.commission_rate

            // Bonus: +2% after 10 referrals (max 20%)
            if (newTotal >= 10 && referrer.commission_rate < 20) {
              newRate = Math.min(referrer.commission_rate + 2, 20)
            }

            await supabaseAdmin
              .from("affiliates")
              .update({ 
                total_referrals: newTotal,
                commission_rate: newRate
              })
              .eq("id", referrer.id)

            // Update new user's profile with referrer
            await supabaseAdmin
              .from("profiles")
              .update({ referred_by: referrer.id })
              .eq("id", user.id)
          }
        }
      }
    }
  }

  // Redirect to dashboard
  return NextResponse.redirect(`${origin}/dashboard`)
}
