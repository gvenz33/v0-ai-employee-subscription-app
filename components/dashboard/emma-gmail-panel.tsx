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
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Loader2, Mail, Link2, Unlink, Inbox, FileEdit, Trash2, Clock } from "lucide-react"

type Account = { id: string; email: string; connectedAt: string | null }

type DraftCreated = {
  threadId: string
  messageId: string
  from: string
  subject: string
  draftId: string
  replySubject: string
  replyPreview: string
  mailbox?: string
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
  mailbox?: string
}

type SeenMessage = {
  messageId: string
  threadId: string
  from: string
  subject: string
  snippet: string
  unread: boolean
  date: string
  mailbox?: string
}

type ScheduleState = {
  isActive: boolean
  frequency: "hourly" | "every_2_hours" | "every_4_hours" | "daily"
  timeLocal: string
  timezone: string
  deliveryEmail: string
  autoCreateDrafts: boolean
  nextRunAt?: string | null
  lastRunAt?: string | null
  lastError?: string | null
}

export function EmmaGmailPanel() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [maxAccounts, setMaxAccounts] = useState(20)
  const [canConnectMore, setCanConnectMore] = useState(true)
  const [activeConnectionId, setActiveConnectionId] = useState<string>("")

  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [creatingDraft, setCreatingDraft] = useState(false)

  const [scanning, setScanning] = useState(false)
  const [scannedCount, setScannedCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeThreads, setActiveThreads] = useState(0)
  const [seenMessages, setSeenMessages] = useState<SeenMessage[]>([])
  const [draftsCreated, setDraftsCreated] = useState<DraftCreated[]>([])
  const [cleanup, setCleanup] = useState<CleanupSuggestion[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [applying, setApplying] = useState(false)

  const [schedule, setSchedule] = useState<ScheduleState>({
    isActive: false,
    frequency: "every_4_hours",
    timeLocal: "09:00",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles",
    deliveryEmail: "",
    autoCreateDrafts: true,
  })
  const [savingSchedule, setSavingSchedule] = useState(false)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const [statusRes, schedRes] = await Promise.all([
        fetch("/api/gmail/status"),
        fetch("/api/gmail/schedule"),
      ])
      const data = await statusRes.json()
      if (!statusRes.ok) {
        toast.error(data.error || "Failed to load Gmail status")
        return
      }
      setConfigured(Boolean(data.configured))
      const list: Account[] = data.accounts || []
      setAccounts(list)
      setMaxAccounts(data.maxAccounts || 20)
      setCanConnectMore(Boolean(data.canConnectMore))
      if (list.length && !activeConnectionId) {
        setActiveConnectionId(list[0].id)
      } else if (list.length && !list.some((a) => a.id === activeConnectionId)) {
        setActiveConnectionId(list[0].id)
      }

      if (schedRes.ok) {
        const s = await schedRes.json()
        if (s.schedule) {
          setSchedule({
            isActive: Boolean(s.schedule.isActive),
            frequency: s.schedule.frequency || "every_4_hours",
            timeLocal: s.schedule.timeLocal || "09:00",
            timezone: s.schedule.timezone || schedule.timezone,
            deliveryEmail: s.schedule.deliveryEmail || list[0]?.email || "",
            autoCreateDrafts: s.schedule.autoCreateDrafts !== false,
            nextRunAt: s.schedule.nextRunAt,
            lastRunAt: s.schedule.lastRunAt,
            lastError: s.schedule.lastError,
          })
        } else if (list[0]?.email && !schedule.deliveryEmail) {
          setSchedule((prev) => ({ ...prev, deliveryEmail: list[0].email }))
        }
      }
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConnectionId])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  useEffect(() => {
    const gmail = searchParams.get("gmail")
    if (!gmail) return
    if (gmail === "connected") {
      toast.success("Gmail account connected")
      loadStatus()
    } else if (gmail === "error") {
      toast.error(searchParams.get("message") || "Gmail connection failed")
    }
    router.replace("/dashboard/employees/email-assistant", { scroll: false })
  }, [searchParams, router, loadStatus])

  const disconnect = async (connectionId: string) => {
    const res = await fetch(`/api/gmail/status?connectionId=${encodeURIComponent(connectionId)}`, {
      method: "DELETE",
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || "Failed to disconnect")
      return
    }
    toast.success("Gmail account disconnected")
    setDraftsCreated([])
    setCleanup([])
    setSeenMessages([])
    await loadStatus()
  }

  const saveSchedule = async () => {
    setSavingSchedule(true)
    try {
      const res = await fetch("/api/gmail/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: schedule.isActive,
          frequency: schedule.frequency,
          timeLocal: schedule.timeLocal,
          timezone: schedule.timezone,
          deliveryEmail: schedule.deliveryEmail,
          autoCreateDrafts: schedule.autoCreateDrafts,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to save schedule")
        return
      }
      toast.success(schedule.isActive ? "Scheduled scans enabled" : "Schedule saved (paused)")
      if (data.schedule) {
        setSchedule((prev) => ({
          ...prev,
          nextRunAt: data.schedule.nextRunAt,
          lastRunAt: data.schedule.lastRunAt,
          lastError: data.schedule.lastError,
        }))
      }
    } finally {
      setSavingSchedule(false)
    }
  }

  const createDraft = async () => {
    setCreatingDraft(true)
    try {
      const res = await fetch("/api/gmail/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject,
          body,
          connectionId: activeConnectionId || undefined,
        }),
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
      const res = await fetch("/api/gmail/inbox/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to scan inbox")
        return
      }
      setScannedCount(data.scanned || 0)
      setUnreadCount(data.unread || 0)
      setActiveThreads(data.activeThreadsFound ?? 0)
      setSeenMessages(data.seenMessages || [])
      setDraftsCreated(data.draftsCreated || [])
      setCleanup(data.cleanupSuggestions || [])
      setSelected({})

      const drafted = (data.draftsCreated || []).length
      const cleanupN = (data.cleanupSuggestions || []).length
      const scanned = data.scanned || 0
      const unread = data.unread || 0
      if (scanned === 0) {
        toast.message("Gmail returned 0 inbox messages in the last 30 days")
      } else {
        toast.success(
          `Read ${scanned} messages (${unread} unread) → ${drafted} reply draft(s), ${cleanupN} cleanup`,
        )
      }
    } finally {
      setScanning(false)
    }
  }

  const selectedItems = cleanup.filter((c) => selected[c.messageId])

  const applyCleanup = async () => {
    setApplying(true)
    try {
      // Group by mailbox → connectionId
      const byMailbox = new Map<string, CleanupSuggestion[]>()
      for (const item of selectedItems) {
        const key = item.mailbox || accounts[0]?.email || ""
        if (!byMailbox.has(key)) byMailbox.set(key, [])
        byMailbox.get(key)!.push(item)
      }

      let spamN = 0
      let trashN = 0
      let unsubN = 0

      for (const [mailbox, items] of byMailbox) {
        const conn = accounts.find((a) => a.email === mailbox) || accounts[0]
        const res = await fetch("/api/gmail/inbox/cleanup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirm: true,
            connectionId: conn?.id,
            actions: items.map((c) => ({
              messageId: c.messageId,
              action: c.action,
              listUnsubscribe: c.listUnsubscribe,
              listUnsubscribePost: c.listUnsubscribePost,
            })),
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || `Cleanup failed for ${mailbox}`)
          continue
        }
        spamN += data.spam?.marked?.length || 0
        trashN += data.trash?.trashed?.length || 0
        unsubN += (data.unsubscribe || []).filter((u: { ok: boolean }) => u.ok).length
      }

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

  const connected = accounts.length > 0

  return (
    <div className="mb-4 space-y-4">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-primary" />
            Gmail accounts
          </CardTitle>
          <CardDescription>
            Connect up to {maxAccounts} Google/Gmail accounts for triage. Scan creates reply drafts on active
            threads; cleanup still needs your confirm. Emma never auto-sends or permanently deletes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!configured ? (
            <p className="text-sm text-muted-foreground">
              Gmail OAuth is not configured yet. Add <code className="text-xs">GOOGLE_CLIENT_ID</code> and{" "}
              <code className="text-xs">GOOGLE_CLIENT_SECRET</code> in Vercel env vars.
            </p>
          ) : (
            <>
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No Gmail accounts connected yet.</p>
              ) : (
                <ul className="space-y-2">
                  {accounts.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={a.id === activeConnectionId ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => setActiveConnectionId(a.id)}
                        >
                          {a.email}
                        </Badge>
                        {a.id === activeConnectionId ? (
                          <span className="text-xs text-muted-foreground">active for manual drafts</span>
                        ) : null}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => disconnect(a.id)}>
                        <Unlink className="mr-2 h-4 w-4" />
                        Disconnect
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {canConnectMore ? (
                  <Button asChild size="sm">
                    <a href="/api/gmail/oauth/start">
                      <Link2 className="mr-2 h-4 w-4" />
                      {connected ? "Connect another Gmail" : "Connect Gmail"}
                    </a>
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">Maximum of {maxAccounts} accounts reached.</p>
                )}
                <span className="text-xs text-muted-foreground">
                  {accounts.length} / {maxAccounts} connected
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {connected && (
        <>
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-primary" />
                Automatic scan schedule
              </CardTitle>
              <CardDescription>
                Emma scans all connected accounts on a schedule and emails you a summary (drafts created + cleanup
                suggestions). Runs via the existing 5-minute cron.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="emma-sched-active">Enable scheduled scans</Label>
                <Switch
                  id="emma-sched-active"
                  checked={schedule.isActive}
                  onCheckedChange={(v) => setSchedule((p) => ({ ...p, isActive: v }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={schedule.frequency}
                    onValueChange={(v) =>
                      setSchedule((p) => ({
                        ...p,
                        frequency: v as ScheduleState["frequency"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Every hour</SelectItem>
                      <SelectItem value="every_2_hours">Every 2 hours</SelectItem>
                      <SelectItem value="every_4_hours">Every 4 hours</SelectItem>
                      <SelectItem value="daily">Once daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emma-time">Daily time (for daily frequency)</Label>
                  <Input
                    id="emma-time"
                    value={schedule.timeLocal}
                    onChange={(e) => setSchedule((p) => ({ ...p, timeLocal: e.target.value }))}
                    placeholder="09:00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emma-tz">Timezone</Label>
                  <Input
                    id="emma-tz"
                    value={schedule.timezone}
                    onChange={(e) => setSchedule((p) => ({ ...p, timezone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emma-delivery">Summary email to</Label>
                  <Input
                    id="emma-delivery"
                    type="email"
                    value={schedule.deliveryEmail}
                    onChange={(e) => setSchedule((p) => ({ ...p, deliveryEmail: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="emma-auto-drafts">Auto-create reply drafts on scheduled scans</Label>
                <Switch
                  id="emma-auto-drafts"
                  checked={schedule.autoCreateDrafts}
                  onCheckedChange={(v) => setSchedule((p) => ({ ...p, autoCreateDrafts: v }))}
                />
              </div>
              {schedule.nextRunAt ? (
                <p className="text-xs text-muted-foreground">
                  Next run: {new Date(schedule.nextRunAt).toLocaleString()}
                  {schedule.lastRunAt
                    ? ` · Last: ${new Date(schedule.lastRunAt).toLocaleString()}`
                    : ""}
                  {schedule.lastError ? ` · Last error: ${schedule.lastError}` : ""}
                </p>
              ) : null}
              <Button size="sm" onClick={saveSchedule} disabled={savingSchedule || !schedule.deliveryEmail}>
                {savingSchedule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                Save schedule
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Inbox className="h-4 w-4 text-primary" />
                    Inbox scan
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Scans all connected accounts now. Prioritizes unread (last 30 days).
                    {scannedCount
                      ? ` Last scan: ${scannedCount} messages (${unreadCount} unread), ${activeThreads} active threads.`
                      : ""}
                  </CardDescription>
                </div>
                <Button size="sm" onClick={scanInbox} disabled={scanning}>
                  {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Inbox className="mr-2 h-4 w-4" />}
                  {scanning ? "Scanning…" : "Scan all inboxes"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {seenMessages.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-foreground">Messages Emma read</h3>
                  <ul className="max-h-48 space-y-2 overflow-y-auto">
                    {seenMessages.map((m) => (
                      <li
                        key={`${m.mailbox || ""}-${m.messageId}`}
                        className="rounded-md border border-border/60 px-3 py-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium text-foreground">{m.subject}</span>
                          {m.unread ? <Badge variant="secondary">unread</Badge> : null}
                          {m.mailbox ? <Badge variant="outline">{m.mailbox}</Badge> : null}
                        </div>
                        <p className="mt-0.5 truncate text-muted-foreground">{m.from}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground">Reply drafts created</h3>
                {!draftsCreated.length ? (
                  <p className="text-sm text-muted-foreground">
                    No reply drafts. Emma only auto-drafts active back-and-forth threads that need a response.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {draftsCreated.map((d) => (
                      <li key={d.draftId} className="rounded-lg border border-border p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{d.replySubject || d.subject}</p>
                          <Badge variant="secondary">draft saved</Badge>
                          {d.mailbox ? <Badge variant="outline">{d.mailbox}</Badge> : null}
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
                      <li key={`${c.mailbox}-${c.messageId}`} className="flex gap-3 rounded-lg border border-border p-3">
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
                            {c.mailbox ? <Badge variant="outline">{c.mailbox}</Badge> : null}
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
                Saves to the selected account
                {activeConnectionId
                  ? ` (${accounts.find((a) => a.id === activeConnectionId)?.email || "…"})`
                  : ""}
                .
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
              Selected messages will be marked Spam, unsubscribed (when possible), and/or moved to Trash across the
              relevant mailboxes.
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
