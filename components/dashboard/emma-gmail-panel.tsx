"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, Mail, Link2, Unlink, Inbox, FileEdit, Trash2 } from "lucide-react"

type DraftCreated = {
  threadId: string
  messageId: string
  from: string
  subject: string
  draftId: string
  replySubject: string
  replyPreview: string
}

type CleanupSuggestion = {
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

export function EmmaGmailPanel() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(false)
  const [connected, setConnected] = useState(false)
  const [mailbox, setMailbox] = useState<string | null>(null)

  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [creatingDraft, setCreatingDraft] = useState(false)

  const [scanning, setScanning] = useState(false)
  const [scannedCount, setScannedCount] = useState(0)
  const [activeThreads, setActiveThreads] = useState(0)
  const [draftsCreated, setDraftsCreated] = useState<DraftCreated[]>([])
  const [cleanup, setCleanup] = useState<CleanupSuggestion[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [applying, setApplying] = useState(false)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/gmail/status")
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to load Gmail status")
        return
      }
      setConfigured(Boolean(data.configured))
      setConnected(Boolean(data.connected))
      setMailbox(data.email || null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  useEffect(() => {
    const gmail = searchParams.get("gmail")
    if (!gmail) return
    if (gmail === "connected") {
      toast.success("Gmail connected")
      loadStatus()
    } else if (gmail === "error") {
      toast.error(searchParams.get("message") || "Gmail connection failed")
    }
    router.replace("/dashboard/employees/email-assistant", { scroll: false })
  }, [searchParams, router, loadStatus])

  const disconnect = async () => {
    const res = await fetch("/api/gmail/status", { method: "DELETE" })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || "Failed to disconnect")
      return
    }
    setConnected(false)
    setMailbox(null)
    setDraftsCreated([])
    setCleanup([])
    toast.success("Gmail disconnected")
  }

  const createDraft = async () => {
    setCreatingDraft(true)
    try {
      const res = await fetch("/api/gmail/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to create draft")
        return
      }
      toast.success(`Draft saved in Gmail${data.mailbox ? ` (${data.mailbox})` : ""}`)
      setTo("")
      setSubject("")
      setBody("")
    } finally {
      setCreatingDraft(false)
    }
  }

  const scanInbox = async () => {
    setScanning(true)
    try {
      const res = await fetch("/api/gmail/inbox/triage", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to scan inbox")
        return
      }
      setScannedCount(data.scanned || 0)
      setActiveThreads(data.activeThreadsConsidered || 0)
      setDraftsCreated(data.draftsCreated || [])
      setCleanup(data.cleanupSuggestions || [])
      setSelected({})

      const drafted = (data.draftsCreated || []).length
      const cleanupN = (data.cleanupSuggestions || []).length
      toast.success(
        `Scan done: ${drafted} reply draft(s) created, ${cleanupN} cleanup suggestion(s)`,
      )
    } finally {
      setScanning(false)
    }
  }

  const selectedItems = cleanup.filter((c) => selected[c.messageId])

  const applyCleanup = async () => {
    setApplying(true)
    try {
      const res = await fetch("/api/gmail/inbox/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: true,
          actions: selectedItems.map((c) => ({
            messageId: c.messageId,
            action: c.action,
            listUnsubscribe: c.listUnsubscribe,
            listUnsubscribePost: c.listUnsubscribePost,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Cleanup failed")
        return
      }
      const spamN = data.spam?.marked?.length || 0
      const trashN = data.trash?.trashed?.length || 0
      const unsubN = (data.unsubscribe || []).filter((u: { ok: boolean }) => u.ok).length
      toast.success(`Applied: ${spamN} spam, ${trashN} trash, ${unsubN} unsubscribe`)
      const doneIds = new Set(selectedItems.map((s) => s.messageId))
      setCleanup((prev) => prev.filter((c) => !doneIds.has(c.messageId)))
      setSelected({})
      setConfirmOpen(false)
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <Card className="mb-4 border-border bg-card">
        <CardContent className="flex items-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Gmail tools…
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mb-4 space-y-4">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-primary" />
            Gmail connection
          </CardTitle>
          <CardDescription>
            Scan creates reply drafts for active threads automatically. Cleanup (spam / unsubscribe / trash)
            still needs your confirmation. Emma never sends mail or permanently deletes messages.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {!configured ? (
            <p className="text-sm text-muted-foreground">
              Gmail OAuth is not configured yet. Add <code className="text-xs">GOOGLE_CLIENT_ID</code> and{" "}
              <code className="text-xs">GOOGLE_CLIENT_SECRET</code> in Vercel env vars.
            </p>
          ) : connected ? (
            <>
              <Badge variant="outline" className="border-green-600/40 text-green-600">
                Connected · {mailbox}
              </Badge>
              <Button variant="outline" size="sm" onClick={disconnect}>
                <Unlink className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <a href="/api/gmail/oauth/start">
                <Link2 className="mr-2 h-4 w-4" />
                Connect Gmail
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {connected && (
        <>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Inbox className="h-4 w-4 text-primary" />
                    Inbox scan
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Auto-drafts replies on active back-and-forth threads. Suggests spam, unsubscribe, and trash
                    for the rest.
                    {scannedCount
                      ? ` Last scan: ${scannedCount} messages, ${activeThreads} active threads checked.`
                      : ""}
                  </CardDescription>
                </div>
                <Button size="sm" onClick={scanInbox} disabled={scanning}>
                  {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Inbox className="mr-2 h-4 w-4" />}
                  {scanning ? "Scanning…" : "Scan inbox"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground">Reply drafts created</h3>
                {!draftsCreated.length ? (
                  <p className="text-sm text-muted-foreground">
                    No reply drafts yet. Run a scan — Emma auto-creates drafts only for active threads that need a
                    response. Review them in Gmail Drafts before sending.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {draftsCreated.map((d) => (
                      <li key={d.draftId} className="rounded-lg border border-border p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{d.replySubject || d.subject}</p>
                          <Badge variant="secondary">draft saved</Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{d.from}</p>
                        <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{d.replyPreview}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-foreground">Cleanup suggestions</h3>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!selectedItems.length}
                    onClick={() => setConfirmOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Apply selected ({selectedItems.length})
                  </Button>
                </div>
                {!cleanup.length ? (
                  <p className="text-sm text-muted-foreground">No cleanup suggestions from the last scan.</p>
                ) : (
                  <ul className="space-y-3">
                    {cleanup.map((c) => (
                      <li key={c.messageId} className="flex gap-3 rounded-lg border border-border p-3">
                        <Checkbox
                          checked={Boolean(selected[c.messageId])}
                          onCheckedChange={(v) =>
                            setSelected((prev) => ({ ...prev, [c.messageId]: v === true }))
                          }
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium">{c.subject}</p>
                            <Badge variant="outline">{c.action}</Badge>
                            <Badge variant="secondary">{c.confidence}</Badge>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{c.from}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.snippet}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{c.reason}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileEdit className="h-4 w-4 text-primary" />
                Manual Gmail draft
              </CardTitle>
              <CardDescription>
                Optional fallback — save any draft directly (not sent). Prefer Scan for thread replies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emma-to">To</Label>
                  <Input
                    id="emma-to"
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="recipient@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emma-subject">Subject</Label>
                  <Input
                    id="emma-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject line"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emma-body">Body</Label>
                <textarea
                  id="emma-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  placeholder="Email body…"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Button onClick={createDraft} disabled={creatingDraft || !to || !subject || !body}>
                {creatingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileEdit className="mr-2 h-4 w-4" />}
                Save draft in Gmail
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply {selectedItems.length} cleanup action(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Selected messages will be marked Spam, unsubscribed (when possible), and/or moved to Trash. Nothing is
              permanently deleted. Mailto-only unsubscribe links are noted and the message is still moved to Trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={applyCleanup} disabled={applying}>
              {applying ? "Applying…" : "Confirm cleanup"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
