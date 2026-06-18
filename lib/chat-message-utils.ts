import type { UIMessage } from "ai"

export type ChatMessageRow = {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

export type ChatSessionRow = {
  id: string
  employee_id: string
  title: string | null
  created_at: string
  updated_at: string
}

export function getTextFromUIMessage(msg: {
  parts?: Array<{ type: string; text?: string }>
  content?: string
}): string {
  if (msg.parts?.length) {
    return msg.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join("")
  }
  if (typeof msg.content === "string") return msg.content
  return ""
}

export function getLastUserTextFromUIMessages(
  messages: Array<{ role: string; parts?: Array<{ type: string; text?: string }>; content?: string }>,
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      return getTextFromUIMessage(messages[i]).trim()
    }
  }
  return ""
}

export function chatRowToUIMessage(row: ChatMessageRow): UIMessage {
  return {
    id: row.id,
    role: row.role,
    parts: [{ type: "text", text: row.content }],
  } as UIMessage
}

export function sessionTitleFromMessage(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim()
  if (!cleaned) return "New conversation"
  return cleaned.length > 60 ? `${cleaned.slice(0, 57)}...` : cleaned
}
