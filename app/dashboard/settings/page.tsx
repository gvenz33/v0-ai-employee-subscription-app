"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { User, Bell, Shield, Key, Save, Loader2, Globe, RefreshCw, Sparkles } from "lucide-react"
import { AutomationEmailSetupCard } from "@/components/dashboard/automation-email-setup-card"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingWhiteLabel, setSavingWhiteLabel] = useState(false)
  const [submittingSla, setSubmittingSla] = useState(false)
  const [subscriptionTier, setSubscriptionTier] = useState("personal")
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    api_key: ""
  })
  const [whiteLabel, setWhiteLabel] = useState({
    enabled: false,
    brand_name: "",
    logo_url: "",
    support_email: "",
    primary_color: "",
    remove_247_branding: false,
    public_landing_enabled: false,
    branded_auth_enabled: true,
    page_title: "",
    meta_description: "",
    og_image_url: "",
    privacy_policy_url: "",
    terms_of_service_url: "",
    hero_headline: "",
    hero_subheadline: "",
    hero_primary_cta_label: "",
    hero_primary_cta_href: "",
    support_page_markdown: "",
  })
  const [tenantSlug, setTenantSlug] = useState("")
  const [tenantUrl, setTenantUrl] = useState("")
  const [customDomainConfigured, setCustomDomainConfigured] = useState(false)
  const [customDomainCnameTarget, setCustomDomainCnameTarget] = useState("")
  const [customDomainDetail, setCustomDomainDetail] = useState<{
    hostname: string
    status: string
    ssl_ready: boolean
    health_ok: boolean | null
    last_health_check_at: string | null
    last_sync_at: string | null
    is_active: boolean
  } | null>(null)
  const [customDomainHostname, setCustomDomainHostname] = useState("")
  const [customDomainSaving, setCustomDomainSaving] = useState(false)
  const [slaTargets, setSlaTargets] = useState({
    uptime_percent: 99.9,
    urgent_first_response_hours: 4,
    standard_first_response_business_hours: 24,
  })
  const [slaTickets, setSlaTickets] = useState<
    Array<{
      id: string
      title: string
      description: string
      severity: "standard" | "urgent" | "critical"
      status: "open" | "acknowledged" | "resolved"
      responded_at: string | null
      created_at: string
    }>
  >([])
  const [slaForm, setSlaForm] = useState({
    title: "",
    description: "",
    severity: "standard" as "standard" | "urgent" | "critical",
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
          setSubscriptionTier(data.subscription_tier || "personal")
          setProfile({
            full_name: data.full_name || "",
            email: user.email || "",
            api_key: data.api_key || ""
          })

          if (data.subscription_tier === "enterprise") {
            const [whiteLabelRes, slaRes] = await Promise.all([
              fetch("/api/user/white-label", { cache: "no-store" }),
              fetch("/api/user/sla", { cache: "no-store" }),
            ])

            if (whiteLabelRes.ok) {
              const whiteLabelData = await whiteLabelRes.json()
              if (whiteLabelData?.settings) {
                const s = whiteLabelData.settings
                setWhiteLabel({
                  enabled: Boolean(s.enabled),
                  brand_name: s.brand_name || "",
                  logo_url: s.logo_url || "",
                  support_email: s.support_email || "",
                  primary_color: s.primary_color || "",
                  remove_247_branding: Boolean(s.remove_247_branding),
                  public_landing_enabled: Boolean(s.public_landing_enabled),
                  branded_auth_enabled: s.branded_auth_enabled !== false,
                  page_title: s.page_title || "",
                  meta_description: s.meta_description || "",
                  og_image_url: s.og_image_url || "",
                  privacy_policy_url: s.privacy_policy_url || "",
                  terms_of_service_url: s.terms_of_service_url || "",
                  hero_headline: s.hero_headline || "",
                  hero_subheadline: s.hero_subheadline || "",
                  hero_primary_cta_label: s.hero_primary_cta_label || "",
                  hero_primary_cta_href: s.hero_primary_cta_href || "",
                  support_page_markdown: s.support_page_markdown || "",
                })
              }
              if (whiteLabelData?.tenant?.slug) {
                setTenantSlug(whiteLabelData.tenant.slug)
                setTenantUrl(whiteLabelData.tenant.url || "")
              }
            }

            if (slaRes.ok) {
              const slaData = await slaRes.json()
              if (slaData?.targets) setSlaTargets(slaData.targets)
              if (Array.isArray(slaData?.tickets)) setSlaTickets(slaData.tickets)
            }

            const cdRes = await fetch("/api/user/custom-domain", { cache: "no-store" })
            if (cdRes.ok) {
              const cdData = await cdRes.json()
              setCustomDomainConfigured(Boolean(cdData.configured))
              setCustomDomainCnameTarget(cdData.cname_target_hint || "")
              if (cdData.domain) {
                setCustomDomainDetail({
                  hostname: cdData.domain.hostname,
                  status: cdData.domain.status,
                  ssl_ready: cdData.domain.ssl_ready,
                  health_ok: cdData.domain.health_ok ?? null,
                  last_health_check_at: cdData.domain.last_health_check_at,
                  last_sync_at: cdData.domain.last_sync_at,
                  is_active: cdData.domain.is_active,
                })
                setCustomDomainHostname(cdData.domain.hostname)
              }
            }
          }
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

  async function handleSaveWhiteLabel() {
    setSavingWhiteLabel(true)
    try {
      const res = await fetch("/api/user/white-label", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...whiteLabel, tenant_slug: tenantSlug }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to save white-label settings")
      } else {
        if (data.tenant_host) setTenantUrl(`https://${data.tenant_host}`)
        toast.success("White-label settings saved")
      }
    } catch {
      toast.error("Failed to save white-label settings")
    } finally {
      setSavingWhiteLabel(false)
    }
  }

  async function handleSaveCustomDomain() {
    const host = customDomainHostname.trim().toLowerCase()
    if (!host) {
      toast.error("Enter a hostname such as app.yourbrand.com")
      return
    }
    setCustomDomainSaving(true)
    try {
      const res = await fetch("/api/user/custom-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname: host }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Could not save custom domain")
      } else {
        toast.success("Custom domain saved — finish DNS at your registrar")
        const refresh = await fetch("/api/user/custom-domain", { cache: "no-store" })
        if (refresh.ok) {
          const cdData = await refresh.json()
          setCustomDomainConfigured(Boolean(cdData.configured))
          setCustomDomainCnameTarget(cdData.cname_target_hint || "")
          if (cdData.domain) {
            setCustomDomainDetail({
              hostname: cdData.domain.hostname,
              status: cdData.domain.status,
              ssl_ready: cdData.domain.ssl_ready,
              health_ok: cdData.domain.health_ok ?? null,
              last_health_check_at: cdData.domain.last_health_check_at,
              last_sync_at: cdData.domain.last_sync_at,
              is_active: cdData.domain.is_active,
            })
          }
        }
      }
    } catch {
      toast.error("Could not save custom domain")
    } finally {
      setCustomDomainSaving(false)
    }
  }

  async function handleRefreshCustomDomain() {
    setCustomDomainSaving(true)
    try {
      const res = await fetch("/api/user/custom-domain", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
      const data = await res.json()
      if (data.skipped) {
        toast.message("Vercel sync not configured — status updates when DNS propagates.")
      } else if (!res.ok) {
        toast.error(data.error || "Refresh failed")
      } else {
        toast.success(`Status refreshed (${data.status ?? "ok"})`)
        const refresh = await fetch("/api/user/custom-domain", { cache: "no-store" })
        if (refresh.ok) {
          const cdData = await refresh.json()
          if (cdData.domain) {
            setCustomDomainDetail({
              hostname: cdData.domain.hostname,
              status: cdData.domain.status,
              ssl_ready: cdData.domain.ssl_ready,
              health_ok: cdData.domain.health_ok ?? null,
              last_health_check_at: cdData.domain.last_health_check_at,
              last_sync_at: cdData.domain.last_sync_at,
              is_active: cdData.domain.is_active,
            })
          }
        }
      }
    } catch {
      toast.error("Refresh failed")
    } finally {
      setCustomDomainSaving(false)
    }
  }

  async function handleToggleCustomDomain(next: boolean) {
    setCustomDomainSaving(true)
    try {
      const res = await fetch("/api/user/custom-domain", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: next }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Update failed")
      } else {
        toast.success(next ? "Custom domain activated" : "Custom domain deactivated")
        setCustomDomainDetail((prev) =>
          prev ? { ...prev, is_active: next, status: data.status ?? prev.status } : prev,
        )
      }
    } catch {
      toast.error("Update failed")
    } finally {
      setCustomDomainSaving(false)
    }
  }

  async function handleRemoveCustomDomain() {
    if (!confirm("Remove this custom domain from your account and Vercel? Your tenant subdomain will keep working.")) {
      return
    }
    setCustomDomainSaving(true)
    try {
      const res = await fetch("/api/user/custom-domain", { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Remove failed")
      } else {
        toast.success("Custom domain removed")
        setCustomDomainDetail(null)
        setCustomDomainHostname("")
      }
    } catch {
      toast.error("Remove failed")
    } finally {
      setCustomDomainSaving(false)
    }
  }

  async function handleCreateSlaTicket() {
    if (!slaForm.title.trim() || !slaForm.description.trim()) {
      toast.error("Please add a title and description for your SLA request")
      return
    }

    setSubmittingSla(true)
    try {
      const res = await fetch("/api/user/sla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slaForm),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to create SLA ticket")
      } else {
        toast.success("SLA ticket submitted")
        if (data.ticket) {
          setSlaTickets((prev) => [data.ticket, ...prev])
        }
        setSlaForm({ title: "", description: "", severity: "standard" })
      }
    } catch {
      toast.error("Failed to create SLA ticket")
    } finally {
      setSubmittingSla(false)
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

      {subscriptionTier === "enterprise" && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>White Label Options</CardTitle>
            <CardDescription>
              Configure custom branding for your Founders tier workspace and integrations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Enable white-label mode</p>
                <p className="text-sm text-muted-foreground">Use your brand identity in customer-facing outputs.</p>
              </div>
              <Switch
                checked={whiteLabel.enabled}
                onCheckedChange={(checked) => setWhiteLabel((prev) => ({ ...prev, enabled: checked }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="wlBrandName">Brand Name</Label>
                <Input
                  id="wlBrandName"
                  value={whiteLabel.brand_name}
                  onChange={(e) => setWhiteLabel((prev) => ({ ...prev, brand_name: e.target.value }))}
                  placeholder="Your company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wlSupportEmail">Support Email</Label>
                <Input
                  id="wlSupportEmail"
                  value={whiteLabel.support_email}
                  onChange={(e) => setWhiteLabel((prev) => ({ ...prev, support_email: e.target.value }))}
                  placeholder="support@yourdomain.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wlLogoUrl">Logo URL</Label>
                <Input
                  id="wlLogoUrl"
                  value={whiteLabel.logo_url}
                  onChange={(e) => setWhiteLabel((prev) => ({ ...prev, logo_url: e.target.value }))}
                  placeholder="https://yourdomain.com/logo.png"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wlPrimaryColor">Primary Color</Label>
                <Input
                  id="wlPrimaryColor"
                  value={whiteLabel.primary_color}
                  onChange={(e) => setWhiteLabel((prev) => ({ ...prev, primary_color: e.target.value }))}
                  placeholder="#4f46e5"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="wlTenantSlug">Tenant subdomain slug</Label>
                <Input
                  id="wlTenantSlug"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value.toLowerCase())}
                  placeholder="clientname"
                />
                <p className="text-xs text-muted-foreground">
                  Your tenant URL will be:{" "}
                  {tenantUrl || (tenantSlug ? `https://${tenantSlug}.247aiemployees.net` : "https://<slug>.247aiemployees.net")}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Remove 247 branding</p>
                <p className="text-sm text-muted-foreground">Hide 247 AI Employees branding where white-label is applied.</p>
              </div>
              <Switch
                checked={whiteLabel.remove_247_branding}
                onCheckedChange={(checked) =>
                  setWhiteLabel((prev) => ({ ...prev, remove_247_branding: checked }))
                }
              />
            </div>

            <Button onClick={handleSaveWhiteLabel} disabled={savingWhiteLabel}>
              {savingWhiteLabel ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save White Label Settings
            </Button>
          </CardContent>
        </Card>
      )}

      {subscriptionTier === "enterprise" && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Custom domain
            </CardTitle>
            <CardDescription>
              Map your own hostname (for example app.client.com) after your tenant subdomain is saved above. Point a{" "}
              <strong>CNAME</strong> at Vercel&apos;s target; we verify DNS and issue SSL automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!customDomainConfigured && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Server-side domain registration requires <code className="text-xs">VERCEL_TOKEN</code> and{" "}
                <code className="text-xs">VERCEL_PROJECT_ID</code> in production. You can still save your hostname for when
                those are configured.
              </p>
            )}

            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-mono">
              CNAME target: {customDomainCnameTarget || "cname.vercel-dns.com"}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customDomainHost">Hostname</Label>
              <Input
                id="customDomainHost"
                value={customDomainHostname}
                onChange={(e) => setCustomDomainHostname(e.target.value.toLowerCase())}
                placeholder="app.yourbrand.com"
                disabled={customDomainSaving}
              />
              <p className="text-xs text-muted-foreground">
                In your DNS provider, create a CNAME from this hostname to the target above. Propagation can take up to 48
                hours; use &quot;Refresh status&quot; after DNS is live.
              </p>
            </div>

            {customDomainDetail && (
              <div className="grid gap-2 text-sm rounded-md border border-border p-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">{customDomainDetail.status}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>SSL: {customDomainDetail.ssl_ready ? "ready" : "pending"}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>
                    HTTPS check:{" "}
                    {customDomainDetail.health_ok === null
                      ? "—"
                      : customDomainDetail.health_ok
                        ? "OK"
                        : "unreachable"}
                  </span>
                </div>
                {customDomainDetail.last_sync_at && (
                  <p className="text-xs text-muted-foreground">
                    Last sync: {new Date(customDomainDetail.last_sync_at).toLocaleString()}
                    {customDomainDetail.last_health_check_at && (
                      <> · Health: {new Date(customDomainDetail.last_health_check_at).toLocaleString()}</>
                    )}
                  </p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="font-medium text-foreground">Serve traffic on this domain</p>
                    <p className="text-xs text-muted-foreground">Turn off to keep DNS but stop routing to your workspace.</p>
                  </div>
                  <Switch
                    checked={customDomainDetail.is_active}
                    disabled={customDomainSaving}
                    onCheckedChange={handleToggleCustomDomain}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSaveCustomDomain}
                disabled={customDomainSaving || !customDomainHostname.trim()}
              >
                {customDomainSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {customDomainDetail ? "Update domain" : "Save custom domain"}
              </Button>
              <Button type="button" variant="outline" onClick={handleRefreshCustomDomain} disabled={customDomainSaving || !customDomainDetail}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh status
              </Button>
              {customDomainDetail && (
                <Button type="button" variant="destructive" onClick={handleRemoveCustomDomain} disabled={customDomainSaving}>
                  Remove domain
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {subscriptionTier === "enterprise" && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Branded public experience
            </CardTitle>
            <CardDescription>
              Tenant landing, SEO, legal and support links, and branded auth — available on your subdomain or custom domain
              when white-label is enabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Public landing page</p>
                <p className="text-sm text-muted-foreground">
                  Show a branded home at your tenant URL instead of redirecting visitors to sign-in.
                </p>
              </div>
              <Switch
                checked={whiteLabel.public_landing_enabled}
                onCheckedChange={(checked) => setWhiteLabel((prev) => ({ ...prev, public_landing_enabled: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Branded auth pages</p>
                <p className="text-sm text-muted-foreground">Logo and colors on sign-in, sign-up, and password recovery.</p>
              </div>
              <Switch
                checked={whiteLabel.branded_auth_enabled}
                onCheckedChange={(checked) => setWhiteLabel((prev) => ({ ...prev, branded_auth_enabled: checked }))}
              />
            </div>
            <Separator />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="pubPageTitle">Page title (SEO)</Label>
                <Input
                  id="pubPageTitle"
                  value={whiteLabel.page_title}
                  onChange={(e) => setWhiteLabel((prev) => ({ ...prev, page_title: e.target.value }))}
                  placeholder="My Company · AI workspace"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="pubMetaDesc">Meta description</Label>
                <Textarea
                  id="pubMetaDesc"
                  value={whiteLabel.meta_description}
                  onChange={(e) => setWhiteLabel((prev) => ({ ...prev, meta_description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="pubOg">Open Graph image URL</Label>
                <Input
                  id="pubOg"
                  value={whiteLabel.og_image_url}
                  onChange={(e) => setWhiteLabel((prev) => ({ ...prev, og_image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pubPrivacy">Privacy policy URL</Label>
                <Input
                  id="pubPrivacy"
                  value={whiteLabel.privacy_policy_url}
                  onChange={(e) => setWhiteLabel((prev) => ({ ...prev, privacy_policy_url: e.target.value }))}
                  placeholder="https://... (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pubTerms">Terms of service URL</Label>
                <Input
                  id="pubTerms"
                  value={whiteLabel.terms_of_service_url}
                  onChange={(e) => setWhiteLabel((prev) => ({ ...prev, terms_of_service_url: e.target.value }))}
                  placeholder="https://... (optional)"
                />
              </div>
            </div>
            <Separator />
            <p className="text-sm font-medium text-foreground">Landing copy (optional)</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="pubHeroH">Headline</Label>
                <Input
                  id="pubHeroH"
                  value={whiteLabel.hero_headline}
                  onChange={(e) => setWhiteLabel((prev) => ({ ...prev, hero_headline: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="pubHeroS">Subheadline</Label>
                <Textarea
                  id="pubHeroS"
                  value={whiteLabel.hero_subheadline}
                  onChange={(e) => setWhiteLabel((prev) => ({ ...prev, hero_subheadline: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pubCtaL">Primary CTA label</Label>
                <Input
                  id="pubCtaL"
                  value={whiteLabel.hero_primary_cta_label}
                  onChange={(e) => setWhiteLabel((prev) => ({ ...prev, hero_primary_cta_label: e.target.value }))}
                  placeholder="Get started"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pubCtaH">Primary CTA link</Label>
                <Input
                  id="pubCtaH"
                  value={whiteLabel.hero_primary_cta_href}
                  onChange={(e) => setWhiteLabel((prev) => ({ ...prev, hero_primary_cta_href: e.target.value }))}
                  placeholder="/auth/sign-up or https://..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pubSupport">Support page (plain text, line breaks)</Label>
              <Textarea
                id="pubSupport"
                value={whiteLabel.support_page_markdown}
                onChange={(e) => setWhiteLabel((prev) => ({ ...prev, support_page_markdown: e.target.value }))}
                rows={5}
                placeholder="Shown at /support on your tenant host."
              />
            </div>
            <Button onClick={handleSaveWhiteLabel} disabled={savingWhiteLabel} variant="secondary">
              {savingWhiteLabel ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save public experience
            </Button>
            <p className="text-xs text-muted-foreground">
              Or use &quot;Save White Label Settings&quot; in the section above — both save all of these fields.
            </p>
          </CardContent>
        </Card>
      )}

      {subscriptionTier === "enterprise" && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>SLA Guarantee</CardTitle>
            <CardDescription>
              Founders tier SLA: {slaTargets.uptime_percent}% uptime target, urgent first response in{" "}
              {slaTargets.urgent_first_response_hours} hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
              Standard requests target first response within {slaTargets.standard_first_response_business_hours} business hours.
            </div>

            <div className="grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="slaTitle">Report issue</Label>
                <Input
                  id="slaTitle"
                  value={slaForm.title}
                  onChange={(e) => setSlaForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Service interruption, production issue, or urgent support request"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slaSeverity">Severity</Label>
                <select
                  id="slaSeverity"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={slaForm.severity}
                  onChange={(e) =>
                    setSlaForm((prev) => ({
                      ...prev,
                      severity: e.target.value as "standard" | "urgent" | "critical",
                    }))
                  }
                >
                  <option value="standard">Standard</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slaDescription">Description</Label>
                <Textarea
                  id="slaDescription"
                  value={slaForm.description}
                  onChange={(e) => setSlaForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  placeholder="Describe impact, affected workflows, and any timeline details."
                />
              </div>

              <Button onClick={handleCreateSlaTicket} disabled={submittingSla}>
                {submittingSla ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Submit SLA Ticket
              </Button>
            </div>

            <Separator />
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Recent SLA tickets</p>
              {slaTickets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No SLA tickets submitted yet.</p>
              ) : (
                slaTickets.slice(0, 5).map((ticket) => (
                  <div key={ticket.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-foreground">{ticket.title}</p>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {ticket.severity} · {ticket.status}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Created {new Date(ticket.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
