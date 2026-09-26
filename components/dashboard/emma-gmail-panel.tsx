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

type Suggestion = {
  messageId: string
  from: string
  subject: string
  snippet: string
  date: string
  classification: "spam" | "solicitation"
  confidence: "high" | "medium"
  reason: string
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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [scannedCount, setScannedCount] = useState(0)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [trashing, setTrashing] = useState(false)

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
    setSuggestions([])
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
      const res = await fetch("/api/gmail/inbox/suggestions")
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to scan inbox")
        return
      }
      setSuggestions(data.suggestions || [])
      setScannedCount(data.scanned || 0)
      setSelected({})
      if (!(data.suggestions || []).length) {
        toast.success(`Scanned ${data.scanned || 0} messages — no spam/solicitation suggestions`)
      }
    } finally {
      setScanning(false)
    }
  }

  const selectedIds = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([id]) => id)

  const trashSelected = async () => {
    setTrashing(true)
    try {
      const res = await fetch("/api/gmail/inbox/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, messageIds: selectedIds }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to move to Trash")
        return
      }
      toast.success(`Moved ${data.trashed?.length || 0} message(s) to Trash`)
      setSuggestions((prev) => prev.filter((s) => !data.trashed?.includes(s.messageId)))
      setSelected({})
      setConfirmOpen(false)
    } finally {
      setTrashing(false)
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
            Connect Gmail so Emma can create drafts and suggest spam/solicitation cleanups. Messages are never
            permanently deleted — confirmed actions only move mail to Trash.
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
              <Badge variant="outline" className="text-green-600 border-green-600/40">
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
              <CardTitle className="flex items-center gap-2 text-base">
                <FileEdit className="h-4 w-4 text-primary" />
                Create Gmail draft
              </CardTitle>
              <CardDescription>
                Save a draft in your Gmail Drafts folder (not sent). Use chat with Emma to refine copy first if you want.
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
                  rows={6}
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

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Inbox className="h-4 w-4 text-primary" />
                    Spam & solicitation suggestions
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Scans recent inbox mail and suggests cleanup. Review before moving anything to Trash.
                    {scannedCount ? ` Last scan: ${scannedCount} messages.` : ""}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={scanInbox} disabled={scanning}>
                    {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Inbox className="mr-2 h-4 w-4" />}
                    Scan inbox
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!selectedIds.length}
                    onClick={() => setConfirmOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Move selected to Trash ({selectedIds.length})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!suggestions.length ? (
                <p className="text-sm text-muted-foreground">No suggestions yet. Run a scan to review your inbox.</p>
              ) : (
                <ul className="space-y-3">
                  {suggestions.map((s) => (
                    <li
                      key={s.messageId}
                      className="flex gap-3 rounded-lg border border-border p-3"
                    >
                      <Checkbox
                        checked={Boolean(selected[s.messageId])}
                        onCheckedChange={(v) =>
                          setSelected((prev) => ({ ...prev, [s.messageId]: v === true }))
                        }
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">{s.subject}</p>
                          <Badge variant="outline">{s.classification}</Badge>
                          <Badge variant="secondary">{s.confidence}</Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{s.from}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.snippet}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{s.reason}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move {selectedIds.length} message(s) to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves selected Gmail messages to Trash (recoverable). Emma will not permanently delete mail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={trashing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={trashSelected} disabled={trashing}>
              {trashing ? "Moving…" : "Confirm move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
