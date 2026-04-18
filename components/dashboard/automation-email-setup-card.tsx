"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Mail, Trash2 } from "lucide-react"
import { toast } from "sonner"

type Provider = "gmail" | "outlook" | "smtp"

type Loaded = {
  configured: boolean
  provider: Provider | null
  from_name: string
  from_email: string
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  smtp_user: string
  has_password: boolean
}

type Props = {
  /** When true, shows a link to the other location for the same form */
  showCrossLink?: boolean
  crossLinkHref?: string
  crossLinkLabel?: string
}

export function AutomationEmailSetupCard({
  showCrossLink,
  crossLinkHref = "/dashboard/settings",
  crossLinkLabel = "Open full settings",
}: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [provider, setProvider] = useState<Provider>("gmail")
  const [fromName, setFromName] = useState("")
  const [fromEmail, setFromEmail] = useState("")
  const [smtpUser, setSmtpUser] = useState("")
  const [smtpPassword, setSmtpPassword] = useState("")
  const [smtpHost, setSmtpHost] = useState("")
  const [smtpPort, setSmtpPort] = useState(587)
  const [smtpSecure, setSmtpSecure] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [hasPassword, setHasPassword] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/user/automation-email")
      const data = (await res.json()) as Loaded & { error?: string }
      if (!res.ok) {
        toast.error(data.error || "Could not load email settings")
        return
      }
      setConfigured(data.configured)
      if (data.provider) setProvider(data.provider)
      setFromName(data.from_name || "")
      setFromEmail(data.from_email || "")
      setSmtpUser(data.smtp_user || "")
      setSmtpHost(data.smtp_host || "")
      setSmtpPort(data.smtp_port || 587)
      setSmtpSecure(Boolean(data.smtp_secure))
      setHasPassword(data.has_password)
      setSmtpPassword("")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/user/automation-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          from_name: fromName || null,
          from_email: fromEmail,
          smtp_user: smtpUser,
          smtp_password: smtpPassword || undefined,
          smtp_host: provider === "smtp" ? smtpHost : undefined,
          smtp_port: provider === "smtp" ? smtpPort : undefined,
          smtp_secure: provider === "smtp" ? smtpSecure : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Save failed")
        return
      }
      toast.success("Automation email settings saved")
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm("Remove saved email credentials? Automations will fall back to platform email if configured.")) {
      return
    }
    const res = await fetch("/api/user/automation-email", { method: "DELETE" })
    if (!res.ok) {
      toast.error("Could not remove settings")
      return
    }
    toast.success("Removed")
    setSmtpPassword("")
    await load()
  }

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="flex items-center gap-2 py-8 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading email settings…
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5 text-primary" />
          Automation email sending
        </CardTitle>
        <CardDescription>
          Scheduled automation digests send <strong>from your mailbox</strong> when you save SMTP details below.
          Gmail and Microsoft 365 use preset servers; use an{" "}
          <a
            className="text-primary underline underline-offset-2"
            href="https://support.google.com/accounts/answer/185833"
            target="_blank"
            rel="noreferrer"
          >
            app password
          </a>{" "}
          (Google) or{" "}
          <a
            className="text-primary underline underline-offset-2"
            href="https://support.microsoft.com/account-billing/using-app-passwords-with-apps-that-don-t-support-two-step-verification-589e0139-ade3-47e6-ae50-73990d19569e"
            target="_blank"
            rel="noreferrer"
          >
            Microsoft app passwords
          </a>{" "}
          when two-step verification is on. OAuth &quot;Sign in with Google/Microsoft&quot; for sending is not wired
          yet—SMTP only.
        </CardDescription>
        {showCrossLink && (
          <p className="text-sm pt-2">
            <Link href={crossLinkHref} className="text-primary hover:underline">
              {crossLinkLabel}
            </Link>
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {configured && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Saved. Automations will use this account{hasPassword ? "" : " (add a password to finish)"}.
          </p>
        )}

        <div className="space-y-2">
          <Label>Provider</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gmail">Gmail (Google)</SelectItem>
              <SelectItem value="outlook">Microsoft 365 / Outlook</SelectItem>
              <SelectItem value="smtp">Other (SMTP)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>From name (optional)</Label>
            <Input
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Your name or business"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label>From email</Label>
            <Input
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="you@gmail.com"
              className="bg-background"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>SMTP username</Label>
          <Input
            value={smtpUser}
            onChange={(e) => setSmtpUser(e.target.value)}
            placeholder="Usually your full email address"
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label>Password or app password</Label>
          <Input
            type="password"
            value={smtpPassword}
            onChange={(e) => setSmtpPassword(e.target.value)}
            placeholder={hasPassword ? "Leave blank to keep current password" : "Required"}
            className="bg-background"
            autoComplete="new-password"
          />
        </div>

        {provider === "smtp" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>SMTP host</Label>
              <Input
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="mail.example.com"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(Number(e.target.value) || 587)}
                className="bg-background"
              />
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <Checkbox
                id="smtp-ssl"
                checked={smtpSecure}
                onCheckedChange={(c) => setSmtpSecure(c === true)}
              />
              <Label htmlFor="smtp-ssl" className="text-sm font-normal cursor-pointer">
                SSL/TLS (e.g. port 465)
              </Label>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleSave} disabled={saving || !fromEmail.trim() || !smtpUser.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
          {configured && (
            <Button type="button" variant="outline" onClick={handleRemove}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
