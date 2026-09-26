import "server-only"

import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import {
  decryptToken,
  encryptToken,
  refreshAccessToken,
} from "@/lib/gmail/oauth"

export type GmailConnectionRow = {
  user_id: string
  email: string
  access_token_encrypted: string
  refresh_token_encrypted: string
  token_expires_at: string | null
  scope: string | null
  connected_at?: string | null
}

export async function getGmailConnection(userId: string): Promise<GmailConnectionRow | null> {
  const admin = getSupabaseAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("user_gmail_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
  return (data as GmailConnectionRow | null) ?? null
}

export async function upsertGmailConnection(input: {
  userId: string
  email: string
  accessToken: string
  refreshToken: string
  expiresIn: number
  scope?: string
}) {
  const admin = getSupabaseAdmin()
  const expiresAt = new Date(Date.now() + Math.max(60, input.expiresIn - 60) * 1000).toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("user_gmail_connections").upsert(
    {
      user_id: input.userId,
      email: input.email,
      access_token_encrypted: encryptToken(input.accessToken),
      refresh_token_encrypted: encryptToken(input.refreshToken),
      token_expires_at: expiresAt,
      scope: input.scope || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )
  if (error) throw new Error(error.message)
}

export async function deleteGmailConnection(userId: string) {
  const admin = getSupabaseAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("user_gmail_connections").delete().eq("user_id", userId)
}

/** Returns a valid access token, refreshing when needed. */
export async function getValidGmailAccessToken(userId: string): Promise<{
  accessToken: string
  email: string
}> {
  const row = await getGmailConnection(userId)
  if (!row) throw new Error("Gmail is not connected")

  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0
  if (expiresAt > Date.now() + 60_000) {
    return { accessToken: decryptToken(row.access_token_encrypted), email: row.email }
  }

  const refreshToken = decryptToken(row.refresh_token_encrypted)
  const refreshed = await refreshAccessToken(refreshToken)
  const nextRefresh = refreshed.refresh_token || refreshToken

  await upsertGmailConnection({
    userId,
    email: row.email,
    accessToken: refreshed.access_token,
    refreshToken: nextRefresh,
    expiresIn: refreshed.expires_in || 3600,
    scope: refreshed.scope || row.scope || undefined,
  })

  return { accessToken: refreshed.access_token, email: row.email }
}

export async function requireSessionUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

function toBase64Url(raw: string): string {
  return Buffer.from(raw, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

export async function gmailCreateDraft(input: {
  accessToken: string
  from: string
  to: string
  subject: string
  body: string
}): Promise<{ draftId: string; messageId?: string }> {
  const mime = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${input.subject.replace(/\r?\n/g, " ")}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=\"UTF-8\"",
    "",
    input.body,
  ].join("\r\n")

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: { raw: toBase64Url(mime) },
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to create Gmail draft")
  }
  return { draftId: data.id, messageId: data.message?.id }
}

export type GmailHeaderMap = Record<string, string>

export type GmailMessageSummary = {
  id: string
  threadId: string
  snippet: string
  from: string
  subject: string
  date: string
  listUnsubscribe: string
  labels: string[]
}

export async function gmailListRecentInbox(input: {
  accessToken: string
  maxResults?: number
}): Promise<GmailMessageSummary[]> {
  const maxResults = Math.min(input.maxResults ?? 20, 40)
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent("in:inbox newer_than:14d")}&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${input.accessToken}` } },
  )
  const listData = await listRes.json()
  if (!listRes.ok) {
    throw new Error(listData.error?.message || "Failed to list Gmail inbox")
  }

  const ids: string[] = (listData.messages || []).map((m: { id: string }) => m.id)
  const out: GmailMessageSummary[] = []

  for (const id of ids) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=List-Unsubscribe&metadataHeaders=Precedence`,
      { headers: { Authorization: `Bearer ${input.accessToken}` } },
    )
    const msg = await msgRes.json()
    if (!msgRes.ok) continue
    const headers: GmailHeaderMap = {}
    for (const h of msg.payload?.headers || []) {
      headers[String(h.name).toLowerCase()] = String(h.value || "")
    }
    out.push({
      id: msg.id,
      threadId: msg.threadId,
      snippet: msg.snippet || "",
      from: headers.from || "",
      subject: headers.subject || "(no subject)",
      date: headers.date || "",
      listUnsubscribe: headers["list-unsubscribe"] || "",
      labels: msg.labelIds || [],
    })
  }

  return out
}

export async function gmailTrashMessages(input: {
  accessToken: string
  messageIds: string[]
}): Promise<{ trashed: string[]; failed: Array<{ id: string; error: string }> }> {
  const trashed: string[] = []
  const failed: Array<{ id: string; error: string }> = []

  for (const id of input.messageIds) {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/trash`, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.accessToken}` },
    })
    if (res.ok) {
      trashed.push(id)
    } else {
      const data = await res.json().catch(() => ({}))
      failed.push({ id, error: data.error?.message || "Trash failed" })
    }
  }

  return { trashed, failed }
}
