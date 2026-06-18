import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { sessionTitleFromMessage } from "@/lib/chat-message-utils"

export async function persistChatExchange(
  supabase: SupabaseClient,
  input: {
    sessionId: string
    userId: string
    employeeId: string
    userText: string
    assistantText: string
  },
) {
  const { sessionId, userId, employeeId, userText, assistantText } = input

  const { data: session } = await supabase
    .from("employee_chat_sessions")
    .select("id, title, employee_id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single()

  if (!session || session.employee_id !== employeeId) {
    return
  }

  const now = new Date().toISOString()
  const inserts: Array<{ session_id: string; role: string; content: string }> = []

  if (userText) {
    inserts.push({ session_id: sessionId, role: "user", content: userText })
  }
  if (assistantText) {
    inserts.push({ session_id: sessionId, role: "assistant", content: assistantText })
  }

  if (inserts.length > 0) {
    await supabase.from("employee_chat_messages").insert(inserts)
  }

  const updates: Record<string, string> = { updated_at: now }
  if (!session.title && userText) {
    updates.title = sessionTitleFromMessage(userText)
  }

  await supabase.from("employee_chat_sessions").update(updates).eq("id", sessionId)
}
