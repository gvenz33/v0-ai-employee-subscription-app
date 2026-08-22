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
  const [workspaceQuery, setWorkspaceQuery] = useState("")
  const [workspaceJson, setWorkspaceJson] = useState<string>("")
  const [newIncident, setNewIncident] = useState({
    title: "",
    description: "",
    severity: "medium",
    is_public: false,
  })

  const workspacePretty = useMemo(() => {
    try {
      return workspaceJson ? JSON.stringify(JSON.parse(workspaceJson), null, 2) : ""
    } catch {
      return workspaceJson
    }
  }, [workspaceJson])

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

  const lookupWorkspace = async () => {
    const res = await fetch(`/api/admin/tenant-support?q=${encodeURIComponent(workspaceQuery)}`)
    const body = await res.json()
    setWorkspaceJson(JSON.stringify(body))
  }

  return (
    <div className="p-8 space-y-10 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Platform Status & Founders Support</h1>
        <p className="text-muted-foreground mt-1">
          Log platform outages, look up Founders customer workspaces, and review recent staff/system activity.
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Customer workspace lookup</CardTitle>
          <CardDescription>
            Find a Founders customer by email or user ID to see usage, domains, and open support escalations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="workspace-q">Email or user ID</Label>
              <Input
                id="workspace-q"
                value={workspaceQuery}
                onChange={(e) => setWorkspaceQuery(e.target.value)}
                placeholder="user@example.com or UUID"
              />
            </div>
            <Button type="button" onClick={lookupWorkspace}>
              Look up
            </Button>
          </div>
          {workspacePretty ? (
            <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto max-h-96 whitespace-pre-wrap">
              {workspacePretty}
            </pre>
          ) : null}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Platform incidents</CardTitle>
          <CardDescription>
            Create or resolve outages and degradations. Mark as public to show Founders customers on their Operations page.
          </CardDescription>
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
              <Label>Show to customers</Label>
              <p className="text-xs text-muted-foreground">Visible on Founders Operations pages when public</p>
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
                <TableHead>Visible</TableHead>
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
          <CardTitle>Recent activity log</CardTitle>
          <CardDescription>Last 80 admin, system, and automated actions across customer workspaces.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Customer workspace</TableHead>
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
