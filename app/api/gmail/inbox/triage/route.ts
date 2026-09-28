import { NextRequest, NextResponse } from "next/server"
import { requireEmailAssistantAccess } from "@/lib/gmail/access"
import {
  getValidGmailAccessToken,
  listGmailConnections,
} from "@/lib/gmail/client"
import { runInboxTriageForMailbox } from "@/lib/gmail/run-inbox-triage"
import { recordAuditLog } from "@/lib/audit-log"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const gate = await requireEmailAssistantAccess()
  if (!gate.ok) return gate.response

  try {
    const body = await request.json().catch(() => ({}))
    const requestedIds: string[] | undefined = Array.isArray(body?.connectionIds)
      ? body.connectionIds.filter((id: unknown) => typeof id === "string")
      : body?.connectionId
        ? [String(body.connectionId)]
        : undefined

    const connections = await listGmailConnections(gate.userId)
    if (!connections.length) {
      return NextResponse.json({ error: "Gmail is not connected" }, { status: 400 })
    }

    const targets = requestedIds?.length
      ? connections.filter((c) => requestedIds.includes(c.id))
      : connections

    if (!targets.length) {
      return NextResponse.json({ error: "No matching Gmail accounts to scan" }, { status: 400 })
    }

    const results = []
    for (const conn of targets.slice(0, 20)) {
      const { accessToken, email } = await getValidGmailAccessToken(gate.userId, conn.id)
      const result = await runInboxTriageForMailbox({
        accessToken,
        email,
        autoCreateDrafts: true,
      })
      results.push({ connectionId: conn.id, ...result })
    }

    await recordAuditLog({
      workspaceOwnerId: gate.userId,
      actorUserId: gate.userId,
      source: "dashboard",
      action: "gmail.inbox.triage",
      resourceType: "gmail_inbox",
      resourceId: gate.userId,
      details: {
        accounts: results.map((r) => ({
          mailbox: r.mailbox,
          scanned: r.scanned,
          unread: r.unread,
          draftsCreated: r.draftsCreated.length,
          cleanupSuggestions: r.cleanupSuggestions.length,
        })),
      },
      request,
    })

    // Backward-compatible flat fields from first mailbox + aggregated arrays
    const first = results[0]
    return NextResponse.json({
      results,
      mailbox: first.mailbox,
      scanned: results.reduce((n, r) => n + r.scanned, 0),
      unread: results.reduce((n, r) => n + r.unread, 0),
      activeThreadsFound: results.reduce((n, r) => n + r.activeThreadsFound, 0),
      activeThreadsConsidered: results.reduce((n, r) => n + r.activeThreadsConsidered, 0),
      seenMessages: results.flatMap((r) =>
        r.seenMessages.map((m) => ({ ...m, mailbox: r.mailbox })),
      ),
      draftsCreated: results.flatMap((r) =>
        r.draftsCreated.map((d) => ({ ...d, mailbox: r.mailbox })),
      ),
      draftFailures: results.flatMap((r) => r.draftFailures),
      replySkipped: results.flatMap((r) => r.replySkipped),
      cleanupSuggestions: results.flatMap((r) =>
        r.cleanupSuggestions.map((c) => ({ ...c, mailbox: r.mailbox })),
      ),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Inbox triage failed"
    const status = message.includes("not connected") ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
