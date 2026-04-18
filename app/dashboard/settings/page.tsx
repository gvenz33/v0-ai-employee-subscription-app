"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { User, Bell, Shield, Key, Save, Loader2 } from "lucide-react"
import { AutomationEmailSetupCard } from "@/components/dashboard/automation-email-setup-card"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    api_key: ""
  })
  const [notifications, setNotifications] = useState({
    email_updates: true,
    task_alerts: true,
    marketing: false
  })

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (data) {
          setProfile({
            full_name: data.full_name || "",
            email: user.email || "",
            api_key: data.api_key || ""
          })
        }
      }
      setLoading(false)
    }
    fetchProfile()
  }, [])

  async function handleSaveProfile() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id)

      if (error) {
        toast.error("Failed to update profile")
      } else {
        toast.success("Profile updated successfully")
      }
    }
    setSaving(false)
  }

  async function handleGenerateApiKey() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const newKey = `ak_${Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")}`

      const { error } = await supabase
        .from("profiles")
        .update({ api_key: newKey })
        .eq("id", user.id)

      if (error) {
        toast.error("Failed to generate API key")
      } else {
        setProfile({ ...profile, api_key: newKey })
        toast.success("New API key generated")
      }
    }
  }

  async function handleChangePassword() {
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })

    if (error) {
      toast.error("Failed to send password reset email")
    } else {
      toast.success("Password reset email sent")
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile.email}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Manage your password and security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Password</p>
              <p className="text-sm text-muted-foreground">Change your account password</p>
            </div>
            <Button variant="outline" onClick={handleChangePassword}>
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      <AutomationEmailSetupCard
        showCrossLink
        crossLinkHref="/dashboard/scheduled-automations"
        crossLinkLabel="Email automations"
      />

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Access
          </CardTitle>
          <CardDescription>Manage your API key for webhook integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <Input
                value={profile.api_key || "No API key generated"}
                readOnly
                className="font-mono text-sm bg-muted"
              />
              <Button variant="outline" onClick={handleGenerateApiKey}>
                {profile.api_key ? "Regenerate" : "Generate"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use this key to authenticate webhook requests. Keep it secret!
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure how you receive updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Email Updates</p>
              <p className="text-sm text-muted-foreground">Receive updates about your account</p>
            </div>
            <Switch
              checked={notifications.email_updates}
              onCheckedChange={(checked) => setNotifications({ ...notifications, email_updates: checked })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Task Alerts</p>
              <p className="text-sm text-muted-foreground">Get notified when tasks complete</p>
            </div>
            <Switch
              checked={notifications.task_alerts}
              onCheckedChange={(checked) => setNotifications({ ...notifications, task_alerts: checked })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Marketing Emails</p>
              <p className="text-sm text-muted-foreground">Receive tips and product updates</p>
            </div>
            <Switch
              checked={notifications.marketing}
              onCheckedChange={(checked) => setNotifications({ ...notifications, marketing: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
