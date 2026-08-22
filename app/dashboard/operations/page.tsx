"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

type Summary = {
  profile: {
    api_access_suspended: boolean
    tasks_used: number
    tasks_limit: number
  }
  counts: {
    audit_events_24h: number
    api_calls_24h: number
    api_calls_rolling_1h: number
    api_hourly_cap: number
    pending_tasks: number
    open_sla_tickets: number
  }
  public_incidents: Array<{
    id: string
    title: string
    severity: string
    status: string
    started_at: string | null
    resolved_at: string | null
  }>
}

type AuditRow = {
  id: string
  source: string
  action: string
  resource_type: string | null
  resource_id: string | null
  ip_truncated: string | null
  created_at: string
}

export default function DashboardOperationsPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const [sumRes, logRes] = await Promise.all([
        fetch("/api/user/operations-summary"),
        fetch("/api/user/audit-logs?limit=40"),
      ])

      if (!sumRes.ok) {
        const body = await sumRes.json().catch(() => ({}))
        setError(body.error || "Operations center is unavailable for your plan.")
        setSummary(null)
      } else {
        setSummary(await sumRes.json())
      }

      if (logRes.ok) {
        const logs = await logRes.json()
        setAudit(logs.logs || [])
      }
      setLoading(false)
    })()
  }, [])

  if (error) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-foreground">Operations</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <p className="text-sm text-muted-foreground mt-4">
          Founders tier includes audit history, usage guardrails, and incident awareness.{" "}
          <Link href="/dashboard/billing" className="text-primary underline">
            View billing
          </Link>
        </p>
      </div>
    )
  }

  if (loading || !summary) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold text-foreground">Operations</h1>
        <p className="text-muted-foreground mt-2">Loading operations data…</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Operations</h1>
        <p className="text-muted-foreground mt-1">
          Usage, audit history, and live status for your workspace (Founders).
        </p>
      </div>

      {summary?.profile.api_access_suspended && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="py-4">
            <CardTitle className="text-base">API access suspended</CardTitle>
            <CardDescription>
              Automated and API traffic is blocked for this account. Contact support to restore access.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">API calls (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{summary?.counts.api_calls_24h ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rolling 1h / hourly cap</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {summary != null
                ? `${summary.counts.api_calls_rolling_1h} / ${summary.counts.api_hourly_cap}`
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Per-workspace API quota window</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Audit events (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{summary?.counts.audit_events_24h ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{summary?.counts.pending_tasks ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary != null ? `${summary.profile.tasks_used} / ${summary.profile.tasks_limit} credits used` : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open SLA tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{summary?.counts.open_sla_tickets ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              <Link href="/dashboard/settings" className="text-primary underline">
                Open settings
              </Link>{" "}
              to manage SLA requests
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Public incidents</CardTitle>
          <CardDescription>Platform-visible incidents affecting availability (subset).</CardDescription>
        </CardHeader>
        <CardContent>
          {!summary?.public_incidents?.length ? (
            <p className="text-sm text-muted-foreground">No active public incidents.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.public_incidents.map((inc) => (
                  <TableRow key={inc.id}>
                    <TableCell className="font-medium">{inc.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{inc.severity}</Badge>
                    </TableCell>
                    <TableCell>{inc.status}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {inc.started_at ? new Date(inc.started_at).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
          <CardDescription>Recent configuration and security-relevant events for your workspace.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!audit.length ? (
            <p className="text-sm text-muted-foreground">No audit events yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Resource</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                      {new Date(row.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{row.action}</TableCell>
                    <TableCell>{row.source}</TableCell>
                    <TableCell className="text-sm">
                      {row.resource_type || "—"}
                      {row.resource_id ? (
                        <span className="text-muted-foreground"> · {row.resource_id.slice(0, 36)}</span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
