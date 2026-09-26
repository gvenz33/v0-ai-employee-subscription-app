import type { GmailMessageSummary } from "@/lib/gmail/client"

export type SpamSuggestion = {
  messageId: string
  from: string
  subject: string
  snippet: string
  date: string
  classification: "spam" | "solicitation"
  confidence: "high" | "medium"
  reason: string
}

const SPAM_SUBJECT_RE =
  /\b(viagra|cialis|crypto\s*giveaway|nigerian\s*prince|wire\s*transfer|lottery\s*winner|claim\s*your\s*prize|adult\s*content|xxx)\b/i

const SOLICITATION_SUBJECT_RE =
  /\b(limited\s*time|act\s*now|buy\s*now|special\s*offer|%?\s*off|free\s*trial|unsubscribe|newsletter|webinar\s*invite|book\s*a\s*demo|flash\s*sale|exclusive\s*deal)\b/i

const SOLICITATION_FROM_RE =
  /\b(noreply|no-reply|marketing|promo|newsletter|offers|news@|mailer-daemon)\b/i

export function suggestSpamOrSolicitations(messages: GmailMessageSummary[]): SpamSuggestion[] {
  const suggestions: SpamSuggestion[] = []

  for (const msg of messages) {
    if (msg.labels.includes("SPAM")) continue

    const hay = `${msg.subject} ${msg.snippet} ${msg.from}`

    if (SPAM_SUBJECT_RE.test(hay)) {
      suggestions.push({
        messageId: msg.id,
        from: msg.from,
        subject: msg.subject,
        snippet: msg.snippet,
        date: msg.date,
        classification: "spam",
        confidence: "high",
        reason: "Matches common spam keywords in subject/snippet",
      })
      continue
    }

    const hasUnsubscribe = Boolean(msg.listUnsubscribe)
    const solicitationSubject = SOLICITATION_SUBJECT_RE.test(msg.subject) || SOLICITATION_SUBJECT_RE.test(msg.snippet)
    const solicitationFrom = SOLICITATION_FROM_RE.test(msg.from)

    if (hasUnsubscribe && (solicitationSubject || solicitationFrom)) {
      suggestions.push({
        messageId: msg.id,
        from: msg.from,
        subject: msg.subject,
        snippet: msg.snippet,
        date: msg.date,
        classification: "solicitation",
        confidence: solicitationSubject && hasUnsubscribe ? "high" : "medium",
        reason: hasUnsubscribe
          ? "Has List-Unsubscribe and looks promotional"
          : "Looks like a marketing solicitation",
      })
      continue
    }

    if (solicitationSubject && solicitationFrom) {
      suggestions.push({
        messageId: msg.id,
        from: msg.from,
        subject: msg.subject,
        snippet: msg.snippet,
        date: msg.date,
        classification: "solicitation",
        confidence: "medium",
        reason: "Promotional sender + offer-style subject",
      })
    }
  }

  return suggestions
}
