import "server-only"

import { generateText } from "ai"
import { PRIMARY_AI_MODEL } from "@/lib/token-economics"
import type { GmailActiveThread, GmailMessageSummary } from "@/lib/gmail/client"
import { extractEmailAddress } from "@/lib/gmail/client"
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

  // Also flag clear noreply marketing with unsubscribe even if heuristic missed
  for (const m of input.summaries) {
    if (skip.has(m.id)) continue
    if (out.some((o) => o.messageId === m.id)) continue
    const from = extractEmailAddress(m.from)
    const unsub = input.unsubscribeHeaders?.[m.id]?.listUnsubscribe || m.listUnsubscribe
    if (unsub && /\b(noreply|no-reply|newsletter|marketing|promo)\b/i.test(from + m.from)) {
      out.push({
        messageId: m.id,
        threadId: m.threadId,
        from: m.from,
        subject: m.subject,
        snippet: m.snippet,
        action: "unsubscribe",
        confidence: "medium",
        reason: "Promotional sender with List-Unsubscribe header",
        listUnsubscribe: unsub,
        listUnsubscribePost: input.unsubscribeHeaders?.[m.id]?.listUnsubscribePost,
      })
    }
  }

  return out
}
