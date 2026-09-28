import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { requireEmailAssistantAccess } from "@/lib/gmail/access"
import { buildGoogleAuthUrl, signOAuthState } from "@/lib/gmail/oauth"
import { countGmailConnections, MAX_GMAIL_ACCOUNTS } from "@/lib/gmail/client"

export async function GET(request: Request) {
  const gate = await requireEmailAssistantAccess()
  if (!gate.ok) return gate.response

  if (!process.env.GOOGLE_CLIENT_ID?.trim() || !process.env.GOOGLE_CLIENT_SECRET?.trim()) {
    return NextResponse.json(
      {
        error:
          "Gmail OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment.",
      },
      { status: 503 },
    )
  }

  if (!process.env.AUTOMATION_EMAIL_SECRET || process.env.AUTOMATION_EMAIL_SECRET.length < 16) {
    return NextResponse.json(
      { error: "AUTOMATION_EMAIL_SECRET must be set to store Gmail tokens securely." },
      { status: 503 },
    )
  }

  const count = await countGmailConnections(gate.userId)
  if (count >= MAX_GMAIL_ACCOUNTS) {
    return NextResponse.json(
      {
        error: `You already connected ${MAX_GMAIL_ACCOUNTS} Gmail accounts (maximum). Disconnect one to add another.`,
      },
      { status: 400 },
    )
  }

  const origin = new URL(request.url).origin
  const state = signOAuthState({
    userId: gate.userId,
    nonce: randomBytes(12).toString("hex"),
    exp: Date.now() + 15 * 60 * 1000,
  })

  const url = buildGoogleAuthUrl({ origin, state })
  return NextResponse.redirect(url)
}
