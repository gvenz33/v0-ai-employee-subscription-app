import { NextResponse } from "next/server"
import { requireEmailAssistantAccess } from "@/lib/gmail/access"
import {
  extractEmailAddress,
  getValidGmailAccessToken,
  gmailCreateReplyDraft,
  gmailGetThread,
  gmailListRecentInbox,
} from "@/lib/gmail/client"
import {
  buildCleanupSuggestions,
  triageActiveThreadsForReplies,
  type DraftResult,
} from "@/lib/gmail/triage"
import { recordAuditLog } from "@/lib/audit-log"

export const maxDuration = 60

export async function POST(request: Request) {
  const gate = await requireEmailAssistantAccess()
  if (!gate.ok) return gate.response

  try {
    const { accessToken, email } = await getValidGmailAccessToken(gate.userId)
    const summaries = await gmailListRecentInbox({ accessToken, maxResults: 25 })

    // Unique threads from inbox list
    const threadIds = [...new Set(summaries.map((m) => m.threadId))]
    const threads = []
    for (const threadId of threadIds.slice(0, 20)) {
      const t = await gmailGetThread({ accessToken, threadId, userEmail: email })
      if (t) threads.push(t)
    }

    const activeForReply = threads.filter(
      (t) => t.isActiveThread && !t.latestFromUser && t.messageCount >= 2,
    )

    // Limit AI reply batch size
    const replyCandidates = activeForReply.slice(0, 8)
    const replyDecisions = await triageActiveThreadsForReplies(replyCandidates, email)

    const draftsCreated: DraftResult[] = []
    const draftFailures: Array<{ threadId: string; error: string }> = []
    const draftedMessageIds = new Set<string>()
    const draftedThreadIds = new Set<string>()

    for (const decision of replyDecisions) {
      if (!decision.needsReply || !decision.replyBody) continue
      if (draftedThreadIds.has(decision.threadId)) continue

      const thread = replyCandidates.find((t) => t.threadId === decision.threadId)
      if (!thread) continue

      const to = extractEmailAddress(thread.latest.from)
      if (!to || to === email.toLowerCase()) continue

      try {
        const draft = await gmailCreateReplyDraft({
          accessToken,
          from: email,
          to,
          subject: decision.replySubject || thread.latest.subject,
          body: decision.replyBody,
          threadId: thread.threadId,
          inReplyTo: thread.latest.messageIdHeader || undefined,
          references: [thread.latest.references, thread.latest.messageIdHeader]
            .filter(Boolean)
            .join(" ")
            .trim() || undefined,
        })
        draftsCreated.push({
          threadId: thread.threadId,
          messageId: thread.latest.id,
          from: thread.latest.from,
          subject: thread.latest.subject,
          draftId: draft.draftId,
          replySubject: decision.replySubject || thread.latest.subject,
          replyPreview: decision.replyBody.slice(0, 280),
        })
        draftedMessageIds.add(thread.latest.id)
        draftedThreadIds.add(thread.threadId)
      } catch (e) {
        draftFailures.push({
          threadId: decision.threadId,
          error: e instanceof Error ? e.message : "Draft failed",
        })
      }
    }

    const unsubscribeHeaders: Record<
      string,
      { listUnsubscribe: string; listUnsubscribePost?: string }
    > = {}
    for (const t of threads) {
      if (t.latest.listUnsubscribe) {
        unsubscribeHeaders[t.latest.id] = {
          listUnsubscribe: t.latest.listUnsubscribe,
          listUnsubscribePost: t.latest.listUnsubscribePost || undefined,
        }
      }
    }

    // Prefer latest message per thread for cleanup list
    const latestByThread = new Map<string, (typeof summaries)[0]>()
    for (const s of summaries) {
      const existing = latestByThread.get(s.threadId)
      if (!existing) latestByThread.set(s.threadId, s)
    }
    const cleanupPool = [...latestByThread.values()].filter(
      (s) => !draftedThreadIds.has(s.threadId),
    )

    const cleanupSuggestions = buildCleanupSuggestions({
      summaries: cleanupPool,
      unsubscribeHeaders,
      skipMessageIds: draftedMessageIds,
    })

    await recordAuditLog({
      workspaceOwnerId: gate.userId,
      actorUserId: gate.userId,
      source: "dashboard",
      action: "gmail.inbox.triage",
      resourceType: "gmail_inbox",
      resourceId: gate.userId,
      details: {
        mailbox: email,
        scanned: summaries.length,
        activeThreads: activeForReply.length,
        draftsCreated: draftsCreated.length,
        cleanupSuggestions: cleanupSuggestions.length,
      },
      request,
    })

    return NextResponse.json({
      mailbox: email,
      scanned: summaries.length,
      activeThreadsConsidered: replyCandidates.length,
      draftsCreated,
      draftFailures,
      cleanupSuggestions,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Inbox triage failed"
    const status = message.includes("not connected") ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
