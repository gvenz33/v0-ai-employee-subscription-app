import "server-only"

import { createHmac, timingSafeEqual } from "crypto"
import { encryptAutomationSecret, decryptAutomationSecret } from "@/lib/automation-email-crypto"

export const GMAIL_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
].join(" ")

function requireGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set")
  }
  return { clientId, clientSecret }
}

export function getGmailOAuthRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/gmail/oauth/callback`
}

function stateSecret(): string {
  return (
    process.env.AUTOMATION_EMAIL_SECRET?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    "gmail-oauth-dev-secret"
  )
}

export function signOAuthState(payload: { userId: string; nonce: string; exp: number }): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url")
  return `${body}.${sig}`
}

export function verifyOAuthState(state: string): { userId: string; nonce: string; exp: number } | null {
  const [body, sig] = state.split(".")
  if (!body || !sig) return null
  const expected = createHmac("sha256", stateSecret()).update(body).digest("base64url")
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      userId: string
      nonce: string
      exp: number
    }
    if (!parsed.userId || !parsed.exp || Date.now() > parsed.exp) return null
    return parsed
  } catch {
    return null
  }
}

export function buildGoogleAuthUrl(input: { origin: string; state: string }): string {
  const { clientId } = requireGoogleOAuthConfig()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGmailOAuthRedirectUri(input.origin),
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: input.state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export type GoogleTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
  token_type: string
  id_token?: string
}

export async function exchangeCodeForTokens(input: {
  origin: string
  code: string
}): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = requireGoogleOAuthConfig()
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGmailOAuthRedirectUri(input.origin),
      grant_type: "authorization_code",
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error_description || data.error || "Failed to exchange OAuth code")
  }
  return data as GoogleTokenResponse
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = requireGoogleOAuthConfig()
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error_description || data.error || "Failed to refresh Gmail token")
  }
  return data as GoogleTokenResponse
}

export async function fetchGoogleUserEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  if (!res.ok || !data.email) {
    throw new Error("Failed to load Google account email")
  }
  return String(data.email).toLowerCase()
}

export function encryptToken(token: string): string {
  return encryptAutomationSecret(token)
}

export function decryptToken(blob: string): string {
  return decryptAutomationSecret(blob)
}
