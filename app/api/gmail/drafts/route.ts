import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireEmailAssistantAccess } from "@/lib/gmail/access"
import { getValidGmailAccessToken, gmailCreateDraft } from "@/lib/gmail/client"
import { recordAuditLog } from "@/lib/audit-log"

const bodySchema = z.object({
  to: z.string().email().max(320),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(50_000),
  connectionId: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  const gate = await requireEmailAssistantAccess()
  if (!gate.ok) return gate.response

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide to (email), subject, and body." }, { status: 400 })
  }

  try {
    const { accessToken, email } = await getValidGmailAccessToken(
      gate.userId,
      parsed.data.connectionId,
    )
    const draft = await gmailCreateDraft({
      accessToken,
      from: email,
      to: parsed.data.to,
      subject: parsed.data.subject,
      body: parsed.data.body,
    })

    await recordAuditLog({
      workspaceOwnerId: gate.userId,
      actorUserId: gate.userId,
      source: "dashboard",
      action: "gmail.draft.create",
      resourceType: "gmail_draft",
      resourceId: draft.draftId,
      details: { to: parsed.data.to, subject: parsed.data.subject },
      request,
    })

    return NextResponse.json({
      success: true,
      draftId: draft.draftId,
      messageId: draft.messageId,
      mailbox: email,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create draft"
    const status = message.includes("not connected") ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
