import "server-only"

import { generateText } from "ai"
import { PRIMARY_AI_MODEL } from "@/lib/token-economics"
import type { GmailActiveThread, GmailMessageSummary } from "@/lib/gmail/client"
import { suggestSpamOrSolicitations } from "@/lib/gmail/spam-heuristics"

export type TriageClassification = "needs_reply" | "spam" | "unsubscribe" | "trash" | "keep"

export type DraftResult = {
  threadId: string
  messageId: string
  from: string
  subject: string
  draftId: string
  replySubject: string
  replyPreview: string
}

export type CleanupSuggestion = {
  messageId: string
  threadId: string
  from: string
  subject: string
  snippet: string
  action: "spam" | "unsubscribe" | "trash"
  confidence: "high" | "medium"
  reason: string
  listUnsubscribe?: string
  listUnsubscribePost?: string
}

export type ReplyTriageItem = {
  threadId: string
  messageId: string
  needsReply: boolean
  replySubject: string
  replyBody: string
  reason: string
}

const REPLY_SYSTEM = `You are Emma, an email assistant. For each active email thread, decide if the latest inbound message needs a human reply, and if so draft a short professional reply.

Rules:
- Only mark needsReply=true when a real response is expected (question, request, decision, scheduling, negotiation).
- Do NOT reply to FYI-only, receipts, shipping, password resets, newsletters, or automated notifications.
- Reply body: plain text, concise, polite, no subject line in body, no markdown fences.
- Subject should be Re: original unless already Re:.
- Return ONLY valid JSON array matching the schema. No commentary.`

function parseJsonArray<T>(text: string): T[] {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "")
  const start = cleaned.indexOf("[")
  const end = cleaned.lastIndexOf("]")
  if (start < 0 || end < 0) return []
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1))
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export async function triageActiveThreadsForReplies(
  threads: GmailActiveThread[],
  userEmail: string,
): Promise<ReplyTriageItem[]> {
  if (!threads.length) return []

  const payload = threads.map((t) => ({
    threadId: t.threadId,
    messageId: t.latest.id,
    from: t.latest.from,
    subject: t.latest.subject,
    snippet: t.latest.snippet,
    body: t.latest.bodyText.slice(0, 3500),
    messageCount: t.messageCount,
  }))

  const { text } = await generateText({
    model: PRIMARY_AI_MODEL,
    system: REPLY_SYSTEM,
    prompt: `User mailbox: ${userEmail}

Active threads (latest message is from someone else):
${JSON.stringify(payload, null, 2)}

Return a JSON array of objects:
[
  {
    "threadId": string,
    "messageId": string,
    "needsReply": boolean,
    "replySubject": string,
    "replyBody": string,
    "reason": string
  }
]
Include one object per thread.`,
  })

  const items = parseJsonArray<{
    threadId?: string
    messageId?: string
    needsReply?: boolean
    replySubject?: string
    replyBody?: string
    reason?: string
  }>(text)

  const byThread = new Map(threads.map((t) => [t.threadId, t]))
  const out: ReplyTriageItem[] = []

  for (const item of items) {
    const thread = item.threadId ? byThread.get(item.threadId) : undefined
    if (!thread) continue
    out.push({
      threadId: thread.threadId,
      messageId: thread.latest.id,
      needsReply: Boolean(item.needsReply),
      replySubject: (item.replySubject || thread.latest.subject).trim(),
      replyBody: (item.replyBody || "").trim(),
      reason: item.reason || "",
    })
  }

  // Fallback: if model skipped a thread, treat as no reply
  for (const t of threads) {
    if (!out.some((o) => o.threadId === t.threadId)) {
      out.push({
        threadId: t.threadId,
        messageId: t.latest.id,
        needsReply: false,
        replySubject: t.latest.subject,
        replyBody: "",
        reason: "No model decision; skipped",
      })
    }
  }

  return out
}

export function buildCleanupSuggestions(input: {
  summaries: GmailMessageSummary[]
  /** messageId -> list-unsubscribe header from full fetch when available */
  unsubscribeHeaders?: Record<string, { listUnsubscribe: string; listUnsubscribePost?: string }>
  /** skip message ids that already got reply drafts */
  skipMessageIds?: Set<string>
}): CleanupSuggestion[] {
  const skip = input.skipMessageIds || new Set()
  const heuristic = suggestSpamOrSolicitations(
    input.summaries.filter((m) => !skip.has(m.id)),
  )

  const out: CleanupSuggestion[] = []

  for (const h of heuristic) {
    const unsub = input.unsubscribeHeaders?.[h.messageId]
    const listUnsub = unsub?.listUnsubscribe || ""
    const summary = input.summaries.find((m) => m.id === h.messageId)
    const hasUnsub = Boolean(listUnsub || summary?.listUnsubscribe)

    let action: CleanupSuggestion["action"] = h.classification === "spam" ? "spam" : "trash"
    if (h.classification === "solicitation" && hasUnsub) {
      action = "unsubscribe"
    } else if (h.classification === "solicitation") {
      action = "trash"
    }

    out.push({
      messageId: h.messageId,
      threadId: summary?.threadId || "",
      from: h.from,
      subject: h.subject,
      snippet: h.snippet,
      action,
      confidence: h.confidence,
      reason: h.reason,
      listUnsubscribe: listUnsub || summary?.listUnsubscribe || undefined,
      listUnsubscribePost: unsub?.listUnsubscribePost,
    })
  }

  // Any remaining List-Unsubscribe mail → unsubscribe suggestion
  for (const m of input.summaries) {
    if (skip.has(m.id)) continue
    if (out.some((o) => o.messageId === m.id)) continue
    const unsub = input.unsubscribeHeaders?.[m.id]?.listUnsubscribe || m.listUnsubscribe
    if (unsub) {
      out.push({
        messageId: m.id,
        threadId: m.threadId,
        from: m.from,
        subject: m.subject,
        snippet: m.snippet,
        action: "unsubscribe",
        confidence: "medium",
        reason: "Has List-Unsubscribe header",
        listUnsubscribe: unsub,
        listUnsubscribePost: input.unsubscribeHeaders?.[m.id]?.listUnsubscribePost,
      })
    }
  }

  return out
}

const CLEANUP_SYSTEM = `You are Emma triaging inbox messages for cleanup only (not replies).
Classify each message as one of: spam, unsubscribe, trash, keep.
- spam: scams, phishing, obvious junk
- unsubscribe: newsletters, marketing, digests the user can leave
- trash: low-value noise that is not worth keeping and not classic spam
- keep: personal/work mail that should stay (including cold emails that may need a human reply later)
Return ONLY a JSON array. No commentary.`

export async function triageCleanupWithAi(
  summaries: GmailMessageSummary[],
  unsubscribeHeaders?: Record<string, { listUnsubscribe: string; listUnsubscribePost?: string }>,
): Promise<CleanupSuggestion[]> {
  if (!summaries.length) return []

  const payload = summaries.slice(0, 20).map((m) => ({
    messageId: m.id,
    threadId: m.threadId,
    from: m.from,
    subject: m.subject,
    snippet: m.snippet,
    unread: m.labels.includes("UNREAD"),
    hasUnsubscribe: Boolean(
      m.listUnsubscribe || unsubscribeHeaders?.[m.id]?.listUnsubscribe,
    ),
  }))

  const { text } = await generateText({
    model: PRIMARY_AI_MODEL,
    system: CLEANUP_SYSTEM,
    prompt: `Classify these inbox messages:
${JSON.stringify(payload, null, 2)}

Return JSON array:
[
  {
    "messageId": string,
    "action": "spam" | "unsubscribe" | "trash" | "keep",
    "confidence": "high" | "medium",
    "reason": string
  }
]`,
  })

  const items = parseJsonArray<{
    messageId?: string
    action?: string
    confidence?: string
    reason?: string
  }>(text)

  const byId = new Map(summaries.map((m) => [m.id, m]))
  const out: CleanupSuggestion[] = []

  for (const item of items) {
    if (!item.messageId || !item.action || item.action === "keep") continue
    if (!["spam", "unsubscribe", "trash"].includes(item.action)) continue
    const m = byId.get(item.messageId)
    if (!m) continue
    const unsub = unsubscribeHeaders?.[m.id]
    out.push({
      messageId: m.id,
      threadId: m.threadId,
      from: m.from,
      subject: m.subject,
      snippet: m.snippet,
      action: item.action as CleanupSuggestion["action"],
      confidence: item.confidence === "high" ? "high" : "medium",
      reason: item.reason || "AI cleanup suggestion",
      listUnsubscribe: unsub?.listUnsubscribe || m.listUnsubscribe || undefined,
      listUnsubscribePost: unsub?.listUnsubscribePost,
    })
  }

  return out
}

export function mergeCleanupSuggestions(
  ...lists: CleanupSuggestion[][]
): CleanupSuggestion[] {
  const out: CleanupSuggestion[] = []
  const seen = new Set<string>()
  for (const list of lists) {
    for (const item of list) {
      if (seen.has(item.messageId)) continue
      seen.add(item.messageId)
      out.push(item)
    }
  }
  return out
}
