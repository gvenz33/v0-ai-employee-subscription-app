/**
 * Build first-party auth confirmation / recovery links that verify on our site.
 * Uses token_hash + verifyOtp instead of Supabase's hosted action_link (which often
 * redirects to a broken page when Site URL / redirect allowlists are misconfigured).
 */
export function buildEmailConfirmUrl(input: {
  origin: string
  tokenHash: string
  type: "email" | "recovery" | "invite" | "email_change"
  next?: string
}): string {
  const url = new URL("/auth/confirm", input.origin)
  url.searchParams.set("token_hash", input.tokenHash)
  url.searchParams.set("type", input.type)
  url.searchParams.set("next", input.next || "/dashboard")
  return url.toString()
}

/**
 * Optional override for OAuth / PKCE redirects (not used for custom Resend emails).
 */
export function getAuthCallbackUrl(origin: string, next?: string): string {
  const devOverride = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL?.trim()
  if (devOverride) return devOverride

  const url = new URL("/auth/callback", origin)
  if (next) url.searchParams.set("next", next)
  return url.toString()
}
