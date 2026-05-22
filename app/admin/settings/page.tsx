"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Settings, Users, DollarSign, Shield, Save, Loader2, MessageSquare } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface AdminSettings {
  support_chat_enabled: boolean
  affiliate_program_enabled: boolean
  max_commission_rate: number
  default_trial_days: number
  require_email_verification: boolean
  allow_signups: boolean
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<AdminSettings>({
    support_chat_enabled: true,
    affiliate_program_enabled: true,
    max_commission_rate: 20,
    default_trial_days: 0,
    require_email_verification: true,
    allow_signups: true
  })
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAffiliates: 0,
    totalRevenue: 0,
    pendingPayouts: 0
  })

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
      
      const { count: affiliateCount } = await supabase
        .from("affiliates")
        .select("*", { count: "exact", head: true })

      const { data: affiliateData } = await supabase
        .from("affiliates")
        .select("total_earnings_cents, pending_earnings_cents")

      let totalEarnings = 0
      let pendingPayouts = 0
      if (affiliateData) {
        affiliateData.forEach(a => {
          totalEarnings += a.total_earnings_cents || 0
          pendingPayouts += a.pending_earnings_cents || 0
        })
      }

      setStats({
        totalUsers: userCount || 0,
        totalAffiliates: affiliateCount || 0,
        totalRevenue: totalEarnings,
        pendingPayouts: pendingPayouts
      })

      const platformRes = await fetch("/api/admin/platform-settings")
      if (platformRes.ok) {
        const platformBody = await platformRes.json()
        if (typeof platformBody.settings?.support_chat_enabled === "boolean") {
          setSettings((prev) => ({
            ...prev,
            support_chat_enabled: platformBody.settings.support_chat_enabled,
          }))
        }
      }

      setLoading(false)
    }
    fetchData()
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/platform-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ support_chat_enabled: settings.support_chat_enabled }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || "Failed to save support chat setting")
        return
      }
      toast.success("Settings saved successfully")
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-muted-foreground">Configure global platform settings</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalAffiliates}</p>
                <p className="text-sm text-muted-foreground">Active Affiliates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  ${(stats.totalRevenue / 100).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Total Commissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  ${(stats.pendingPayouts / 100).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Pending Payouts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Support chatbot
          </CardTitle>
          <CardDescription>
            Control the AI support widget on public pages. White-label sites that remove 247 branding never show the widget.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Enable support chatbot</p>
              <p className="text-sm text-muted-foreground">
                When off, the chat bubble is hidden and the support chat API returns unavailable.
              </p>
            </div>
            <Switch
              checked={settings.support_chat_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, support_chat_enabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Affiliate Program
          </CardTitle>
          <CardDescription>Configure affiliate program settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Enable Affiliate Program</p>
              <p className="text-sm text-muted-foreground">Allow users to earn commissions from referrals</p>
            </div>
            <Switch
              checked={settings.affiliate_program_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, affiliate_program_enabled: checked })}
            />
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Maximum Commission Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="50"
                value={settings.max_commission_rate}
                onChange={(e) => setSettings({ ...settings, max_commission_rate: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">Highest commission rate affiliates can achieve</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Registration
          </CardTitle>
          <CardDescription>Control how users sign up</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Allow New Signups</p>
              <p className="text-sm text-muted-foreground">Enable or disable new user registration</p>
            </div>
            <Switch
              checked={settings.allow_signups}
              onCheckedChange={(checked) => setSettings({ ...settings, allow_signups: checked })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Require Email Verification</p>
              <p className="text-sm text-muted-foreground">Users must verify email before accessing dashboard</p>
            </div>
            <Switch
              checked={settings.require_email_verification}
              onCheckedChange={(checked) => setSettings({ ...settings, require_email_verification: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Platform security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">API Rate Limiting</p>
              <p className="text-sm text-muted-foreground">Limit API requests per user (100/minute)</p>
            </div>
            <Switch checked={true} disabled />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Webhook Signature Verification</p>
              <p className="text-sm text-muted-foreground">Require valid signatures for webhooks</p>
            </div>
            <Switch checked={true} disabled />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </div>
    </div>
  )
}
