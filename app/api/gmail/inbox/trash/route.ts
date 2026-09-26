import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireEmailAssistantAccess } from "@/lib/gmail/access"
import { getValidGmailAccessToken, gmailTrashMessages } from "@/lib/gmail/client"
import { recordAuditLog } from "@/lib/audit-log"

const bodySchema = z.object({
  messageIds: z.array(z.string().min(1).max(128)).min(1).max(25),
  confirm: z.literal(true),
})

export async function POST(request: NextRequest) {
  const gate = await requireEmailAssistantAccess()
  if (!gate.ok) return gate.response

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Send { confirm: true, messageIds: string[] } to move messages to Trash." },
      { status: 400 },
    )
  }

  try {
    const { accessToken, email } = await getValidGmailAccessToken(gate.userId)
    const result = await gmailTrashMessages({
      accessToken,
      messageIds: parsed.data.messageIds,
    })

    await recordAuditLog({
      workspaceOwnerId: gate.userId,
      actorUserId: gate.userId,
      source: "dashboard",
      action: "gmail.trash",
      resourceType: "gmail_messages",
      resourceId: gate.userId,
      details: {
        mailbox: email,
        trashed: result.trashed,
        failed: result.failed,
      },
      request,
    })

    return NextResponse.json({ success: true, ...result, mailbox: email })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to trash messages"
    const status = message.includes("not connected") ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
