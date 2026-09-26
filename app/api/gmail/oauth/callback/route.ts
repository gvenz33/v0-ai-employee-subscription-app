import { NextResponse } from "next/server"
import {
  exchangeCodeForTokens,
  fetchGoogleUserEmail,
  verifyOAuthState,
} from "@/lib/gmail/oauth"
import { upsertGmailConnection } from "@/lib/gmail/client"
import { recordAuditLog } from "@/lib/audit-log"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const origin = requestUrl.origin
  const code = requestUrl.searchParams.get("code")
  const state = requestUrl.searchParams.get("state")
  const oauthError = requestUrl.searchParams.get("error")

  const redirectBase = `${origin}/dashboard/employees/email-assistant`

  if (oauthError) {
    return NextResponse.redirect(
      `${redirectBase}?gmail=error&message=${encodeURIComponent(oauthError)}`,
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${redirectBase}?gmail=error&message=${encodeURIComponent("Missing OAuth code")}`,
    )
  }

  const parsed = verifyOAuthState(state)
  if (!parsed) {
    return NextResponse.redirect(
      `${redirectBase}?gmail=error&message=${encodeURIComponent("Invalid or expired OAuth state")}`,
    )
  }

  try {
    const tokens = await exchangeCodeForTokens({ origin, code })
    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${redirectBase}?gmail=error&message=${encodeURIComponent(
          "Google did not return a refresh token. Disconnect the app in Google Account permissions and try again.",
        )}`,
      )
    }

    const email = await fetchGoogleUserEmail(tokens.access_token)
    await upsertGmailConnection({
      userId: parsed.userId,
      email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in || 3600,
      scope: tokens.scope,
    })

    await recordAuditLog({
      workspaceOwnerId: parsed.userId,
      actorUserId: parsed.userId,
      source: "dashboard",
      action: "gmail.connect",
      resourceType: "user_gmail_connections",
      resourceId: parsed.userId,
      details: { email },
      request,
    })

    return NextResponse.redirect(`${redirectBase}?gmail=connected`)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail connect failed"
    return NextResponse.redirect(`${redirectBase}?gmail=error&message=${encodeURIComponent(message)}`)
  }
}
