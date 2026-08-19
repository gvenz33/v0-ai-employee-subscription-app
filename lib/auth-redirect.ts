/**
 * Build the OAuth / email-confirmation callback URL for Supabase auth flows.
 * Always routes through /auth/callback so PKCE codes are exchanged server-side.
 */
export function getAuthCallbackUrl(origin: string, next?: string): string {
  const devOverride = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL?.trim()
  if (devOverride) return devOverride

  const url = new URL("/auth/callback", origin)
  if (next) url.searchParams.set("next", next)
  return url.toString()
}
