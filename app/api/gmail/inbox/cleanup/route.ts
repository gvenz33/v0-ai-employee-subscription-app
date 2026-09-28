import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireEmailAssistantAccess } from "@/lib/gmail/access"
import {
  getValidGmailAccessToken,
  gmailAttemptUnsubscribe,
  gmailMarkSpam,
  gmailTrashMessages,
} from "@/lib/gmail/client"
import { recordAuditLog } from "@/lib/audit-log"

const bodySchema = z.object({
  confirm: z.literal(true),
  connectionId: z.string().uuid().optional(),
  actions: z
    .array(
      z.object({
        messageId: z.string().min(1).max(128),
        action: z.enum(["spam", "trash", "unsubscribe"]),
        listUnsubscribe: z.string().max(2000).optional(),
        listUnsubscribePost: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(25),
})

export async function POST(request: NextRequest) {
  const gate = await requireEmailAssistantAccess()
  if (!gate.ok) return gate.response

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Send { confirm: true, actions: [{ messageId, action: spam|trash|unsubscribe }] }",
      },
      { status: 400 },
    )
  }

  try {
    const { accessToken, email } = await getValidGmailAccessToken(
      gate.userId,
      parsed.data.connectionId,
    )

    const spamIds = parsed.data.actions.filter((a) => a.action === "spam").map((a) => a.messageId)
    const trashIds = parsed.data.actions.filter((a) => a.action === "trash").map((a) => a.messageId)
    const unsubActions = parsed.data.actions.filter((a) => a.action === "unsubscribe")

    const spamResult = spamIds.length
      ? await gmailMarkSpam({ accessToken, messageIds: spamIds })
      : { marked: [] as string[], failed: [] as Array<{ id: string; error: string }> }

    const trashResult = trashIds.length
      ? await gmailTrashMessages({ accessToken, messageIds: trashIds })
      : { trashed: [] as string[], failed: [] as Array<{ id: string; error: string }> }

    const unsubscribeResults: Array<{
      messageId: string
      ok: boolean
      method: string
      detail: string
      alsoTrashed?: boolean
    }> = []

    for (const action of unsubActions) {
      if (!action.listUnsubscribe) {
        unsubscribeResults.push({
          messageId: action.messageId,
          ok: false,
          method: "none",
          detail: "Missing List-Unsubscribe header",
        })
        continue
      }
      const result = await gmailAttemptUnsubscribe({
        listUnsubscribe: action.listUnsubscribe,
        listUnsubscribePost: action.listUnsubscribePost,
      })
      let alsoTrashed = false
      if (result.ok || result.method === "mailto") {
        // After unsubscribe attempt (or mailto note), move to trash for cleanup
        const t = await gmailTrashMessages({
          accessToken,
          messageIds: [action.messageId],
        })
        alsoTrashed = t.trashed.includes(action.messageId)
      }
      unsubscribeResults.push({
        messageId: action.messageId,
        ok: result.ok,
        method: result.method,
        detail: result.detail,
        alsoTrashed,
      })
    }

    await recordAuditLog({
      workspaceOwnerId: gate.userId,
      actorUserId: gate.userId,
      source: "dashboard",
      action: "gmail.inbox.cleanup",
      resourceType: "gmail_messages",
      resourceId: gate.userId,
      details: {
        mailbox: email,
        spam: spamResult,
        trash: trashResult,
        unsubscribe: unsubscribeResults,
      },
      request,
    })

    return NextResponse.json({
      success: true,
      mailbox: email,
      spam: spamResult,
      trash: trashResult,
      unsubscribe: unsubscribeResults,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cleanup failed"
    const status = message.includes("not connected") ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
