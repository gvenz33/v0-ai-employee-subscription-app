import { type EmailOtpType } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard"
  }
  return next
}

async function ensureProfile(user: {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}) {
  const admin = getSupabaseAdmin()
  const { data: existingProfile } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle()
  if (existingProfile) return

  const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : ""
  const referralCode =
    typeof user.user_metadata?.referral_code === "string" ? user.user_metadata.referral_code : null

  await admin.from("profiles").insert({
    id: user.id,
    email: user.email,
    full_name: fullName,
    subscription_tier: "personal",
    tasks_limit: 100,
  })

  const newReferralCode = `REF${user.id.slice(0, 8).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  await admin.from("affiliates").insert({
    user_id: user.id,
    referral_code: newReferralCode,
    commission_rate: 10,
  })

  if (!referralCode) return

  const { data: referrer } = await admin
    .from("affiliates")
    .select("id, commission_rate, total_referrals")
    .eq("referral_code", referralCode)
    .maybeSingle()

  if (!referrer) return

  await admin.from("referrals").insert({
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

  await admin
    .from("affiliates")
    .update({ total_referrals: newTotal, commission_rate: newRate })
    .eq("id", referrer.id)

  await admin.from("profiles").update({ referred_by: referrer.id }).eq("id", user.id)
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null
  const next = safeNextPath(requestUrl.searchParams.get("next"))
  const origin = requestUrl.origin

  if (!token_hash || !type) {
    const params = new URLSearchParams({
      error: "missing_token",
      error_description: "This confirmation link is incomplete or invalid. Please request a new one.",
    })
    return NextResponse.redirect(`${origin}/auth/error?${params}`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error || !data.user) {
    const params = new URLSearchParams({
      error: error?.message || "verify_failed",
      error_description:
        error?.message ||
        "Could not verify your email. The link may have expired — try signing up again or request a new link.",
    })
    return NextResponse.redirect(`${origin}/auth/error?${params}`)
  }

  await ensureProfile(data.user)

  return NextResponse.redirect(`${origin}${next}`)
}
