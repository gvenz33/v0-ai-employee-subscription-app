import { NextResponse } from "next/server"
import { requireEmailAssistantAccess } from "@/lib/gmail/access"
import { getValidGmailAccessToken, gmailListRecentInbox } from "@/lib/gmail/client"
import { suggestSpamOrSolicitations } from "@/lib/gmail/spam-heuristics"

export async function GET() {
  const gate = await requireEmailAssistantAccess()
  if (!gate.ok) return gate.response

  try {
    const { accessToken, email } = await getValidGmailAccessToken(gate.userId)
    const messages = await gmailListRecentInbox({ accessToken, maxResults: 25 })
    const suggestions = suggestSpamOrSolicitations(messages)

    return NextResponse.json({
      mailbox: email,
      scanned: messages.length,
      suggestions,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to scan inbox"
    const status = message.includes("not connected") ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
