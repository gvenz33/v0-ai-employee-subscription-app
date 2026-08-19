import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard"
  }
  return next
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")
  const next = safeNextPath(requestUrl.searchParams.get("next"))
  const origin = requestUrl.origin

  if (error) {
    const params = new URLSearchParams({
      error,
      error_description: errorDescription || "Authentication was denied or failed.",
    })
    return NextResponse.redirect(`${origin}/auth/error?${params}`)
  }

  if (!code) {
    const params = new URLSearchParams({
      error: "missing_code",
      error_description: "No authentication code was provided. The link may be invalid or expired.",
    })
    return NextResponse.redirect(`${origin}/auth/error?${params}`)
  }

  const supabase = await createClient()
  const { data: { user }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError || !user) {
    const params = new URLSearchParams({
      error: exchangeError?.message || "exchange_failed",
      error_description:
        exchangeError?.message ||
        "Could not verify your email. The link may have expired — try signing up again or request a new link.",
    })
    return NextResponse.redirect(`${origin}/auth/error?${params}`)
  }

  // Check if profile exists
  const { data: existingProfile } = await getSupabaseAdmin()
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single()

  if (!existingProfile) {
    const fullName = user.user_metadata?.full_name || ""
    const referralCode = user.user_metadata?.referral_code

    await getSupabaseAdmin().from("profiles").insert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      subscription_tier: "personal",
      tasks_limit: 100,
    })

    const newReferralCode = `REF${user.id.slice(0, 8).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    await getSupabaseAdmin().from("affiliates").insert({
      user_id: user.id,
      referral_code: newReferralCode,
      commission_rate: 10,
    })

    if (referralCode) {
      const { data: referrer } = await getSupabaseAdmin()
        .from("affiliates")
        .select("id, user_id, commission_rate, total_referrals")
        .eq("referral_code", referralCode)
        .single()

      if (referrer) {
        await getSupabaseAdmin().from("referrals").insert({
          affiliate_id: referrer.id,
          referred_user_id: user.id,
          subscription_tier: "personal",
          commission_cents: 0,
          status: "pending",
        })

        const newTotal = (referrer.total_referrals || 0) + 1
        let newRate = referrer.commission_rate

        if (newTotal >= 10 && referrer.commission_rate < 20) {
          newRate = Math.min(referrer.commission_rate + 2, 20)
        }

        await getSupabaseAdmin()
          .from("affiliates")
          .update({
            total_referrals: newTotal,
            commission_rate: newRate,
          })
          .eq("id", referrer.id)

        await getSupabaseAdmin()
          .from("profiles")
          .update({ referred_by: referrer.id })
          .eq("id", user.id)
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
