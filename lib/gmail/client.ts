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

async function gmailListMessageIds(
  accessToken: string,
  query: string,
  maxResults: number,
): Promise<string[]> {
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const listData = await listRes.json()
  if (!listRes.ok) {
    throw new Error(listData.error?.message || `Failed to list Gmail: ${query}`)
  }
  return (listData.messages || []).map((m: { id: string }) => m.id)
}

async function gmailFetchMessageSummary(
  accessToken: string,
  id: string,
): Promise<GmailMessageSummary | null> {
  const msgRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=List-Unsubscribe&metadataHeaders=List-Unsubscribe-Post&metadataHeaders=Precedence`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const msg = await msgRes.json()
  if (!msgRes.ok) return null
  const headers: GmailHeaderMap = {}
  for (const h of msg.payload?.headers || []) {
    headers[String(h.name).toLowerCase()] = String(h.value || "")
  }
  return {
    id: msg.id,
    threadId: msg.threadId,
    snippet: msg.snippet || "",
    from: headers.from || "",
    subject: headers.subject || "(no subject)",
    date: headers.date || "",
    listUnsubscribe: headers["list-unsubscribe"] || "",
    labels: msg.labelIds || [],
  }
}

/** Unread inbox first, then recent inbox — so Emma actually sees current unread mail. */
export async function gmailListRecentInbox(input: {
  accessToken: string
  maxResults?: number
}): Promise<GmailMessageSummary[]> {
  const maxResults = Math.min(input.maxResults ?? 30, 50)
  const unreadIds = await gmailListMessageIds(
    input.accessToken,
    "in:inbox is:unread newer_than:30d",
    maxResults,
  )
  const recentIds = await gmailListMessageIds(
    input.accessToken,
    "in:inbox newer_than:30d",
    maxResults,
  )

  const orderedIds: string[] = []
  const seen = new Set<string>()
  for (const id of [...unreadIds, ...recentIds]) {
    if (seen.has(id)) continue
    seen.add(id)
    orderedIds.push(id)
    if (orderedIds.length >= maxResults) break
  }

  const out: GmailMessageSummary[] = []
  for (const id of orderedIds) {
    const summary = await gmailFetchMessageSummary(input.accessToken, id)
    if (summary) out.push(summary)
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

export function extractEmailAddress(fromHeader: string): string {
  const angle = fromHeader.match(/<([^>]+)>/)
  if (angle?.[1]) return angle[1].trim().toLowerCase()
  const bare = fromHeader.trim().toLowerCase()
  return bare.includes("@") ? bare.replace(/^"|"$/g, "") : bare
}

function decodeBodyData(data?: string): string {
  if (!data) return ""
  try {
    const normalized = data.replace(/-/g, "+").replace(/_/g, "/")
    return Buffer.from(normalized, "base64").toString("utf8")
  } catch {
    return ""
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPlainTextFromPayload(payload: any): string {
  if (!payload) return ""
  const mime = String(payload.mimeType || "")
  if (mime === "text/plain" && payload.body?.data) {
    return decodeBodyData(payload.body.data)
  }
  const parts = payload.parts || []
  let plain = ""
  let html = ""
  for (const part of parts) {
    const partMime = String(part.mimeType || "")
    if (partMime === "text/plain") {
      plain += decodeBodyData(part.body?.data)
    } else if (partMime === "text/html") {
      html += decodeBodyData(part.body?.data)
    } else if (part.parts) {
      const nested = extractPlainTextFromPayload(part)
      if (nested) plain += nested
    }
  }
  if (plain.trim()) return plain
  if (html.trim()) {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }
  if (payload.body?.data) return decodeBodyData(payload.body.data)
  return ""
}

export type GmailThreadMessage = {
  id: string
  threadId: string
  from: string
  to: string
  subject: string
  date: string
  snippet: string
  bodyText: string
  messageIdHeader: string
  references: string
  inReplyTo: string
  listUnsubscribe: string
  listUnsubscribePost: string
  labels: string[]
  internalDate: number
}

export type GmailActiveThread = {
  threadId: string
  messageCount: number
  latest: GmailThreadMessage
  isActiveThread: boolean
  latestFromUser: boolean
}

function headersToMap(headers: Array<{ name?: string; value?: string }> = []): GmailHeaderMap {
  const map: GmailHeaderMap = {}
  for (const h of headers) {
    map[String(h.name || "").toLowerCase()] = String(h.value || "")
  }
  return map
}

function parseGmailMessage(msg: {
  id: string
  threadId: string
  snippet?: string
  labelIds?: string[]
  internalDate?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any
}): GmailThreadMessage {
  const headers = headersToMap(msg.payload?.headers || [])
  const bodyText = extractPlainTextFromPayload(msg.payload).slice(0, 8000)
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: headers.from || "",
    to: headers.to || "",
    subject: headers.subject || "(no subject)",
    date: headers.date || "",
    snippet: msg.snippet || "",
    bodyText,
    messageIdHeader: headers["message-id"] || "",
    references: headers.references || "",
    inReplyTo: headers["in-reply-to"] || "",
    listUnsubscribe: headers["list-unsubscribe"] || "",
    listUnsubscribePost: headers["list-unsubscribe-post"] || "",
    labels: msg.labelIds || [],
    internalDate: Number(msg.internalDate || 0),
  }
}

export async function gmailGetThread(input: {
  accessToken: string
  threadId: string
  userEmail: string
}): Promise<GmailActiveThread | null> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${input.threadId}?format=full`,
    { headers: { Authorization: `Bearer ${input.accessToken}` } },
  )
  const data = await res.json()
  if (!res.ok) return null

  const messages: GmailThreadMessage[] = (data.messages || []).map(parseGmailMessage)
  if (!messages.length) return null

  messages.sort((a, b) => a.internalDate - b.internalDate)
  const latest = messages[messages.length - 1]
  const userEmail = input.userEmail.toLowerCase()
  const latestFromUser = extractEmailAddress(latest.from) === userEmail
  const hasReplyHeaders = Boolean(latest.inReplyTo || latest.references)
  const isActiveThread = messages.length >= 2 || (messages.length === 1 && hasReplyHeaders && !latestFromUser)

  return {
    threadId: input.threadId,
    messageCount: messages.length,
    latest,
    isActiveThread,
    latestFromUser,
  }
}

export async function gmailCreateReplyDraft(input: {
  accessToken: string
  from: string
  to: string
  subject: string
  body: string
  threadId: string
  inReplyTo?: string
  references?: string
}): Promise<{ draftId: string; messageId?: string }> {
  const subject = input.subject.replace(/\r?\n/g, " ")
  const reSubject = /^re:/i.test(subject) ? subject : `Re: ${subject}`
  const headers = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${reSubject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
  ]
  if (input.inReplyTo) headers.push(`In-Reply-To: ${input.inReplyTo}`)
  if (input.references || input.inReplyTo) {
    const refs = [input.references, input.inReplyTo].filter(Boolean).join(" ").trim()
    if (refs) headers.push(`References: ${refs}`)
  }

  const mime = [...headers, "", input.body].join("\r\n")
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        raw: toBase64Url(mime),
        threadId: input.threadId,
      },
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to create reply draft")
  }
  return { draftId: data.id, messageId: data.message?.id }
}

export async function gmailMarkSpam(input: {
  accessToken: string
  messageIds: string[]
}): Promise<{ marked: string[]; failed: Array<{ id: string; error: string }> }> {
  const marked: string[] = []
  const failed: Array<{ id: string; error: string }> = []

  for (const id of input.messageIds) {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/modify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        addLabelIds: ["SPAM"],
        removeLabelIds: ["INBOX"],
      }),
    })
    if (res.ok) {
      marked.push(id)
    } else {
      const data = await res.json().catch(() => ({}))
      failed.push({ id, error: data.error?.message || "Mark spam failed" })
    }
  }

  return { marked, failed }
}

export function parseListUnsubscribeUrls(header: string): { https: string[]; mailto: string[] } {
  const https: string[] = []
  const mailto: string[] = []
  const matches = header.matchAll(/<([^>]+)>/g)
  for (const m of matches) {
    const url = m[1].trim()
    if (url.toLowerCase().startsWith("mailto:")) mailto.push(url)
    else if (url.toLowerCase().startsWith("https://") || url.toLowerCase().startsWith("http://")) {
      https.push(url)
    }
  }
  return { https, mailto }
}

export async function gmailAttemptUnsubscribe(input: {
  listUnsubscribe: string
  listUnsubscribePost?: string
}): Promise<{ ok: boolean; method: "http" | "mailto" | "none"; detail: string }> {
  const { https, mailto } = parseListUnsubscribeUrls(input.listUnsubscribe)
  if (https.length) {
    const url = https[0]
    const oneClick = /list-unsubscribe=one-click/i.test(input.listUnsubscribePost || "")
    try {
      const res = await fetch(url, {
        method: oneClick ? "POST" : "GET",
        headers: oneClick
          ? { "Content-Type": "application/x-www-form-urlencoded" }
          : undefined,
        body: oneClick ? "List-Unsubscribe=One-Click" : undefined,
        redirect: "follow",
      })
      return {
        ok: res.ok || res.status < 400,
        method: "http",
        detail: `HTTP ${res.status} ${url}`,
      }
    } catch (e) {
      return {
        ok: false,
        method: "http",
        detail: e instanceof Error ? e.message : "Unsubscribe request failed",
      }
    }
  }
  if (mailto.length) {
    return {
      ok: false,
      method: "mailto",
      detail: `Manual mailto unsubscribe required: ${mailto[0]}`,
    }
  }
  return { ok: false, method: "none", detail: "No List-Unsubscribe URL found" }
}
