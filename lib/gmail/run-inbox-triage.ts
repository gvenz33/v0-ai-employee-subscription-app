import "server-only"

import {
  extractEmailAddress,
  gmailCreateReplyDraft,
  gmailGetThread,
  gmailListRecentInbox,
} from "@/lib/gmail/client"
import {
  buildCleanupSuggestions,
  mergeCleanupSuggestions,
  triageActiveThreadsForReplies,
  triageCleanupWithAi,
  type CleanupSuggestion,
  type DraftResult,
} from "@/lib/gmail/triage"

export type InboxTriageResult = {
  mailbox: string
  scanned: number
  unread: number
  activeThreadsFound: number
  activeThreadsConsidered: number
  seenMessages: Array<{
    messageId: string
    threadId: string
    from: string
    subject: string
    snippet: string
    unread: boolean
    date: string
  }>
  draftsCreated: DraftResult[]
  draftFailures: Array<{ threadId: string; error: string }>
  replySkipped: Array<{ threadId: string; subject: string; reason: string }>
  cleanupSuggestions: CleanupSuggestion[]
}

export async function runInboxTriageForMailbox(input: {
  accessToken: string
  email: string
  autoCreateDrafts?: boolean
}): Promise<InboxTriageResult> {
  const autoCreateDrafts = input.autoCreateDrafts !== false
  const { accessToken, email } = input
  const summaries = await gmailListRecentInbox({ accessToken, maxResults: 30 })

  const unreadCount = summaries.filter((m) => m.labels.includes("UNREAD")).length
  const seenMessages = summaries.slice(0, 15).map((m) => ({
    messageId: m.id,
    threadId: m.threadId,
    from: m.from,
    subject: m.subject,
    snippet: m.snippet,
    unread: m.labels.includes("UNREAD"),
    date: m.date,
  }))

  const threadIds = [...new Set(summaries.map((m) => m.threadId))]
  const threads = []
  for (const threadId of threadIds.slice(0, 20)) {
    const t = await gmailGetThread({ accessToken, threadId, userEmail: email })
    if (t) threads.push(t)
  }

  const activeForReply = threads.filter(
    (t) => t.isActiveThread && !t.latestFromUser && t.messageCount >= 2,
  )

  const replyCandidates = activeForReply.slice(0, 8)
  const replyDecisions =
    replyCandidates.length > 0
      ? await triageActiveThreadsForReplies(replyCandidates, email)
      : []

  const draftsCreated: DraftResult[] = []
  const draftFailures: Array<{ threadId: string; error: string }> = []
  const draftedMessageIds = new Set<string>()
  const draftedThreadIds = new Set<string>()
  const replySkipped: Array<{ threadId: string; subject: string; reason: string }> = []

  for (const decision of replyDecisions) {
    if (!decision.needsReply || !decision.replyBody) {
      const thread = replyCandidates.find((t) => t.threadId === decision.threadId)
      if (thread) {
        replySkipped.push({
          threadId: decision.threadId,
          subject: thread.latest.subject,
          reason: decision.reason || "No reply needed",
        })
      }
      continue
    }
    if (draftedThreadIds.has(decision.threadId)) continue

    const thread = replyCandidates.find((t) => t.threadId === decision.threadId)
    if (!thread) continue

    const to = extractEmailAddress(thread.latest.from)
    if (!to || to === email.toLowerCase()) continue

    if (!autoCreateDrafts) {
      replySkipped.push({
        threadId: decision.threadId,
        subject: thread.latest.subject,
        reason: "Reply needed (auto-drafts disabled)",
      })
      continue
    }

    try {
      const draft = await gmailCreateReplyDraft({
        accessToken,
        from: email,
        to,
        subject: decision.replySubject || thread.latest.subject,
        body: decision.replyBody,
        threadId: thread.threadId,
        inReplyTo: thread.latest.messageIdHeader || undefined,
        references:
          [thread.latest.references, thread.latest.messageIdHeader]
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
  for (const s of summaries) {
    if (s.listUnsubscribe && !unsubscribeHeaders[s.id]) {
      unsubscribeHeaders[s.id] = { listUnsubscribe: s.listUnsubscribe }
    }
  }

  const latestByThread = new Map<string, (typeof summaries)[0]>()
  for (const s of summaries) {
    if (!latestByThread.has(s.threadId)) latestByThread.set(s.threadId, s)
  }
  const cleanupPool = [...latestByThread.values()].filter(
    (s) => !draftedThreadIds.has(s.threadId),
  )

  const heuristicCleanup = buildCleanupSuggestions({
    summaries: cleanupPool,
    unsubscribeHeaders,
    skipMessageIds: draftedMessageIds,
  })

  const alreadyFlagged = new Set(heuristicCleanup.map((c) => c.messageId))
  const aiPool = cleanupPool.filter((m) => !alreadyFlagged.has(m.id) && !draftedMessageIds.has(m.id))
  let aiCleanup: CleanupSuggestion[] = []
  try {
    aiCleanup = await triageCleanupWithAi(aiPool, unsubscribeHeaders)
  } catch {
    aiCleanup = []
  }

  const cleanupSuggestions = mergeCleanupSuggestions(heuristicCleanup, aiCleanup)

  return {
    mailbox: email,
    scanned: summaries.length,
    unread: unreadCount,
    activeThreadsFound: activeForReply.length,
    activeThreadsConsidered: replyCandidates.length,
    seenMessages,
    draftsCreated,
    draftFailures,
    replySkipped,
    cleanupSuggestions,
  }
}

export function formatTriageSummaryEmail(
  results: InboxTriageResult[],
): { subject: string; bodyText: string } {
  const totalDrafts = results.reduce((n, r) => n + r.draftsCreated.length, 0)
  const totalCleanup = results.reduce((n, r) => n + r.cleanupSuggestions.length, 0)
  const totalUnread = results.reduce((n, r) => n + r.unread, 0)
  const subject = `[Emma] Inbox scan: ${totalDrafts} draft(s), ${totalCleanup} cleanup, ${totalUnread} unread`

  const parts: string[] = [
    "Emma inbox scan summary",
    "=======================",
    "",
  ]

  for (const r of results) {
    parts.push(`Mailbox: ${r.mailbox}`)
    parts.push(`Scanned: ${r.scanned} | Unread: ${r.unread} | Active threads: ${r.activeThreadsFound}`)
    parts.push(`Reply drafts created: ${r.draftsCreated.length}`)
    for (const d of r.draftsCreated) {
      parts.push(`  - ${d.replySubject || d.subject} ← ${d.from}`)
      parts.push(`    ${d.replyPreview}`)
    }
    parts.push(`Cleanup suggestions: ${r.cleanupSuggestions.length}`)
    for (const c of r.cleanupSuggestions.slice(0, 15)) {
      parts.push(`  - [${c.action}] ${c.subject} ← ${c.from}`)
      parts.push(`    ${c.reason}`)
    }
    if (r.cleanupSuggestions.length > 15) {
      parts.push(`  …and ${r.cleanupSuggestions.length - 15} more`)
    }
    parts.push("")
  }

  parts.push(
    "Open Emma to review drafts in Gmail and apply cleanup:",
    "https://247aiemployees.net/dashboard/employees/email-assistant",
    "",
    "Emma never auto-sends and never permanently deletes mail.",
  )

  return { subject, bodyText: parts.join("\n") }
}
