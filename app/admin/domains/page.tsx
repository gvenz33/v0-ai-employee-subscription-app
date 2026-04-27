"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Loader2, Globe, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface DomainRow {
  id: string
  user_id: string
  hostname: string
  status: string
  ssl_ready: boolean
  health_ok: boolean | null
  last_health_check_at: string | null
  last_sync_at: string | null
  is_active: boolean
  owner_email: string | null
  owner_name: string | null
}

export default function AdminCustomDomainsPage() {
  const [loading, setLoading] = useState(true)
  const [domains, setDomains] = useState<DomainRow[]>([])
  const [vercelConfigured, setVercelConfigured] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/custom-domains", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to load domains")
        setDomains([])
      } else {
        setDomains(data.domains || [])
        setVercelConfigured(Boolean(data.vercelConfigured))
      }
    } catch {
      toast.error("Failed to load domains")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function toggleActive(row: DomainRow, next: boolean) {
    setBusyId(row.id)
    try {
      const res = await fetch("/api/admin/custom-domains", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, is_active: next }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Update failed")
      } else {
        toast.success(next ? "Domain activated" : "Domain deactivated")
        await load()
      }
    } catch {
      toast.error("Update failed")
    } finally {
      setBusyId(null)
    }
  }

  async function adminSync(row: DomainRow) {
    setBusyId(row.id)
    try {
      const res = await fetch("/api/admin/custom-domains", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, sync: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Sync failed")
      } else if (data.skipped) {
        toast.message("Vercel API not configured or no hostname")
      } else {
        toast.success(`Synced — ${data.status ?? "updated"}`)
        await load()
      }
    } catch {
      toast.error("Sync failed")
    } finally {
      setBusyId(null)
    }
  }

  function statusBadge(status: string) {
    const variant: "default" | "secondary" | "destructive" | "outline" =
      status === "active"
        ? "default"
        : status === "verified"
          ? "secondary"
          : status === "disabled" || status === "error"
            ? "destructive"
            : "outline"
    return <Badge variant={variant}>{status}</Badge>
  }

  return (
    <div className="p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-8 w-8" />
            Custom domains
          </h1>
          <p className="text-muted-foreground mt-1">
            Mapped client domains (DNS → Vercel). Health checks run on the sync cron.
          </p>
        </div>
        <Button variant="outline" onClick={() => load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh list
        </Button>
      </div>

      {!vercelConfigured && (
        <p className="mb-4 text-sm text-amber-600 dark:text-amber-400">
          VERCEL_TOKEN / VERCEL_PROJECT_ID are not both set — registration and sync from Vercel will be limited until
          configured.
        </p>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Mapped domains</CardTitle>
          <CardDescription>SSL status comes from Vercel; HTTPS reachability from the 15-minute cron job.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : domains.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom domains registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Hostname</th>
                    <th className="pb-2 pr-4 font-medium">Owner</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">SSL</th>
                    <th className="pb-2 pr-4 font-medium">Health</th>
                    <th className="pb-2 pr-4 font-medium">Active</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-mono text-xs">{row.hostname}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-col">
                          <span>{row.owner_name || "—"}</span>
                          <span className="text-xs text-muted-foreground">{row.owner_email || row.user_id.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">{statusBadge(row.status)}</td>
                      <td className="py-3 pr-4">{row.ssl_ready ? "Yes" : "No"}</td>
                      <td className="py-3 pr-4">
                        {row.health_ok === null ? (
                          "—"
                        ) : row.health_ok ? (
                          <span className="text-emerald-600 dark:text-emerald-400">OK</span>
                        ) : (
                          <span className="text-destructive">Fail</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={row.is_active}
                            disabled={busyId === row.id}
                            onCheckedChange={(checked) => toggleActive(row, checked)}
                          />
                        </div>
                      </td>
                      <td className="py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === row.id || !vercelConfigured}
                          onClick={() => adminSync(row)}
                        >
                          {busyId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sync now"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
