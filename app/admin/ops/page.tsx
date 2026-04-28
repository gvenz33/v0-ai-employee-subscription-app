"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type IncidentRow = {
  id: string
  title: string
  severity: string
  status: string
  is_public: boolean
  started_at: string
}

type AuditAdminRow = {
  id: string
  workspace_owner_id: string
  source: string
  action: string
  resource_type: string | null
  resource_id: string | null
  created_at: string
}

export default function AdminOperationsPage() {
  const [incidents, setIncidents] = useState<IncidentRow[]>([])
  const [audit, setAudit] = useState<AuditAdminRow[]>([])
  const [tenantQuery, setTenantQuery] = useState("")
  const [tenantJson, setTenantJson] = useState<string>("")
  const [newIncident, setNewIncident] = useState({
    title: "",
    description: "",
    severity: "medium",
    is_public: false,
  })

  const tenantPretty = useMemo(() => {
    try {
      return tenantJson ? JSON.stringify(JSON.parse(tenantJson), null, 2) : ""
    } catch {
      return tenantJson
    }
  }, [tenantJson])

  useEffect(() => {
    ;(async () => {
      const [incRes, auditRes] = await Promise.all([
        fetch("/api/admin/incidents"),
        fetch("/api/admin/audit-logs?limit=80"),
      ])
      if (incRes.ok) {
        const body = await incRes.json()
        setIncidents(body.incidents || [])
      }
      if (auditRes.ok) {
        const body = await auditRes.json()
        setAudit(body.logs || [])
      }
    })()
  }, [])

  const reloadIncidents = async () => {
    const incRes = await fetch("/api/admin/incidents")
    if (incRes.ok) {
      const body = await incRes.json()
      setIncidents(body.incidents || [])
    }
  }

  const createIncident = async () => {
    const res = await fetch("/api/admin/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newIncident.title,
        description: newIncident.description || null,
        severity: newIncident.severity,
        is_public: newIncident.is_public,
      }),
    })
    if (!res.ok) return
    setNewIncident({ title: "", description: "", severity: "medium", is_public: false })
    await reloadIncidents()
  }

  const updateIncident = async (id: string, status: string) => {
    const res = await fetch("/api/admin/incidents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    if (!res.ok) return
    await reloadIncidents()
  }

  const lookupTenant = async () => {
    const res = await fetch(`/api/admin/tenant-support?q=${encodeURIComponent(tenantQuery)}`)
    const body = await res.json()
    setTenantJson(JSON.stringify(body))
  }

  return (
    <div className="p-8 space-y-10 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Operations & SLA</h1>
        <p className="text-muted-foreground mt-1">
          Incident workflow, tenant lookup, and cross-tenant audit visibility for staff admins.
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Tenant support lookup</CardTitle>
          <CardDescription>Search by UUID or partial email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="tenant-q">Query</Label>
              <Input
                id="tenant-q"
                value={tenantQuery}
                onChange={(e) => setTenantQuery(e.target.value)}
                placeholder="user@example.com or UUID"
              />
            </div>
            <Button type="button" onClick={lookupTenant}>
              Look up
            </Button>
          </div>
          {tenantPretty ? (
            <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto max-h-96 whitespace-pre-wrap">
              {tenantPretty}
            </pre>
          ) : null}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Incidents</CardTitle>
          <CardDescription>Create or resolve platform incidents. Check “public” to show on status experiences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newIncident.title}
                onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select
                value={newIncident.severity}
                onValueChange={(v) => setNewIncident({ ...newIncident, severity: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">low</SelectItem>
                  <SelectItem value="medium">medium</SelectItem>
                  <SelectItem value="high">high</SelectItem>
                  <SelectItem value="critical">critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              value={newIncident.description}
              onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Public incident</Label>
              <p className="text-xs text-muted-foreground">Visible to end users via /api/public/incidents</p>
            </div>
            <Switch
              checked={newIncident.is_public}
              onCheckedChange={(v) => setNewIncident({ ...newIncident, is_public: v })}
            />
          </div>
          <Button onClick={createIncident} disabled={!newIncident.title.trim()}>
            Create incident
          </Button>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Public</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((inc) => (
                <TableRow key={inc.id}>
                  <TableCell className="font-medium">{inc.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{inc.severity}</Badge>
                  </TableCell>
                  <TableCell>{inc.status}</TableCell>
                  <TableCell>{inc.is_public ? "Yes" : "No"}</TableCell>
                  <TableCell className="space-x-2">
                    {inc.status !== "resolved" ? (
                      <Button size="sm" variant="outline" onClick={() => updateIncident(inc.id, "resolved")}>
                        Resolve
                      </Button>
                    ) : null}
                    {inc.status === "investigating" ? (
                      <Button size="sm" variant="ghost" onClick={() => updateIncident(inc.id, "monitoring")}>
                        Monitoring
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Recent audit (global)</CardTitle>
          <CardDescription>Last 80 entries including admin and automated actions.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.workspace_owner_id.slice(0, 8)}…</TableCell>
                  <TableCell className="font-mono text-sm">{row.action}</TableCell>
                  <TableCell>{row.source}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
