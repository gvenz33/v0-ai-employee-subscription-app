"use client"

import { useEffect, useState } from "react"
import useSWR, { mutate } from "swr"
import { AI_EMPLOYEES } from "@/lib/products"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2, Mail, Trash2 } from "lucide-react"
import { DictationButton } from "@/components/dictation-button"
import { AutomationEmailSetupCard } from "@/components/dashboard/automation-email-setup-card"

const TIMEZONES = [
  { value: "America/Los_Angeles", label: "Pacific (US)" },
  { value: "America/Denver", label: "Mountain (US)" },
  { value: "America/Chicago", label: "Central (US)" },
  { value: "America/New_York", label: "Eastern (US)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "UTC", label: "UTC" },
]

const WEEKDAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
]

interface Automation {
  id: string
  ai_employee_id: string
  title: string | null
  prompt: string
  timezone: string
  time_local: string
  frequency: "daily" | "weekly"
  weekday: number | null
  delivery_email: string
  is_active: boolean
  next_run_at: string
  last_run_at: string | null
  last_error: string | null
  created_at: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

const examplePrompt = `Provide the latest AI news and updates since yesterday. Deliver it in this exact structure:
• 4–6 bullet points of concise news
• One short Instagram caption script (2–3 sentences)
• One line of relevant hashtags (mixed broad + niche)

Use plain text; keep everything skimmable.`

export default function ScheduledAutomationsPage() {
  const { data, error, isLoading } = useSWR<{ automations: Automation[] }>(
    "/api/scheduled-automations",
    fetcher,
    { refreshInterval: 15000 }
  )

  const [employeeId, setEmployeeId] = useState("")
  const [title, setTitle] = useState("")
  const [prompt, setPrompt] = useState("")
  const [timezone, setTimezone] = useState("America/Los_Angeles")
  const [timeLocal, setTimeLocal] = useState("07:00")
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily")
  const [weekday, setWeekday] = useState("1")
  const [deliveryEmail, setDeliveryEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const loadEmail = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user?.email) setDeliveryEmail(user.email)
    }
    loadEmail()
  }, [])

  const automations = data?.automations ?? []

  const employeeName = (id: string) => AI_EMPLOYEES.find((e) => e.id === id)?.name ?? id

  const handleCreate = async () => {
    setFormError(null)
    if (!employeeId || !prompt.trim() || !deliveryEmail.trim()) {
      setFormError("Choose an AI employee, enter instructions, and confirm the delivery email.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/scheduled-automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_employee_id: employeeId,
          title: title.trim() || undefined,
          prompt: prompt.trim(),
          timezone,
          time_local: timeLocal,
          frequency,
          weekday: frequency === "weekly" ? Number(weekday) : null,
          delivery_email: deliveryEmail.trim(),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(typeof json.error === "string" ? json.error : "Could not save automation")
        return
      }
      setTitle("")
      setPrompt("")
      mutate("/api/scheduled-automations")
    } finally {
      setSubmitting(false)
    }
  }

  const setActive = async (id: string, is_active: boolean) => {
    await fetch(`/api/scheduled-automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active }),
    })
    mutate("/api/scheduled-automations")
  }

  const remove = async (id: string) => {
    if (!confirm("Delete this automation?")) return
    await fetch(`/api/scheduled-automations/${id}`, { method: "DELETE" })
    mutate("/api/scheduled-automations")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Email automations</h1>
        <p className="text-muted-foreground">
          Connect Gmail, Microsoft 365, or your own SMTP below (same form as Settings). Dictate or type instructions;
          each run uses task credits. If you do not save your own mailbox, the platform may send via Resend when{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">RESEND_API_KEY</code> is set on the server.
        </p>
      </div>

      <AutomationEmailSetupCard
        showCrossLink
        crossLinkHref="/dashboard/settings"
        crossLinkLabel="Open Settings"
      />

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            New recurring email
          </CardTitle>
          <CardDescription>
            Write the full instructions and output format in the prompt (the AI employee only sees this text each run).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>AI employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {AI_EMPLOYEES.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} — {e.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Short title (optional)</Label>
              <div className="flex gap-2 items-center">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Morning AI digest"
                  className="bg-background flex-1"
                />
                <DictationButton
                  appendText={(snippet) =>
                    setTitle((prev) => (prev ? `${prev.trimEnd()} ` : "") + snippet)
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Instructions & output format</Label>
              <DictationButton
                size="sm"
                className="h-9"
                appendText={(snippet) =>
                  setPrompt((prev) => (prev ? `${prev.trimEnd()} ` : "") + snippet)
                }
              />
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={examplePrompt}
              rows={10}
              className="bg-background font-mono text-sm"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => setPrompt(examplePrompt)}>
              Insert example prompt
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Local time (24h)</Label>
              <Input type="time" value={timeLocal} onChange={(e) => setTimeLocal(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as "daily" | "weekly")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {frequency === "weekly" && (
            <div className="space-y-2 max-w-xs">
              <Label>Day of week</Label>
              <Select value={weekday} onValueChange={setWeekday}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2 max-w-md">
            <Label>Deliver to email</Label>
            <Input
              type="email"
              value={deliveryEmail}
              onChange={(e) => setDeliveryEmail(e.target.value)}
              className="bg-background"
            />
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <Button onClick={handleCreate} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              "Save automation"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle>Your automations</CardTitle>
          <CardDescription>Toggle off to pause. Runs are picked up on the same cron as background tasks (about every 5 minutes).</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          )}
          {error && <p className="text-sm text-destructive">Could not load automations.</p>}
          {!isLoading && !error && automations.length === 0 && (
            <p className="text-sm text-muted-foreground">No automations yet.</p>
          )}
          <ul className="space-y-4">
            {automations.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-3 rounded-lg border border-border/60 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{a.title || employeeName(a.ai_employee_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {employeeName(a.ai_employee_id)} · {a.frequency} at {a.time_local} ({a.timezone}) · → {a.delivery_email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Next run: {new Date(a.next_run_at).toLocaleString()}{" "}
                    {a.last_run_at && <>· Last: {new Date(a.last_run_at).toLocaleString()}</>}
                  </p>
                  {a.last_error && <p className="text-xs text-destructive break-words">Last error: {a.last_error}</p>}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${a.id}`} className="text-xs text-muted-foreground">
                      Active
                    </Label>
                    <Switch
                      id={`active-${a.id}`}
                      checked={a.is_active}
                      onCheckedChange={(v) => setActive(a.id, v)}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(a.id)} aria-label="Delete automation">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
