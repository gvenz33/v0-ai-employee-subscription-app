"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

type Lead = {
  id: string
  created_at: string
  name: string
  email: string
  company_name: string | null
  company_size: string | null
  budget_range: string | null
  timeline: string | null
  message: string
  status: "new" | "contacted" | "qualified" | "closed_won" | "closed_lost"
  internal_notes: string | null
  monthly_quote_cents: number | null
  yearly_quote_cents: number | null
  converted_user_id: string | null
}

export default function FoundersLeadsPage() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [monthlyQuote, setMonthlyQuote] = useState("")
  const [yearlyQuote, setYearlyQuote] = useState("")
  const [convertPassword, setConvertPassword] = useState("")
  const [convertLoading, setConvertLoading] = useState(false)

  async function loadLeads() {
    const res = await fetch(`/api/admin/founders-leads?status=${encodeURIComponent(statusFilter)}`)
    if (!res.ok) return
    const body = await res.json()
    setLeads(body.leads || [])
  }

  useEffect(() => {
    loadLeads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const selectedLead = useMemo(() => leads.find((l) => l.id === selectedId) ?? null, [leads, selectedId])

  useEffect(() => {
    if (!selectedLead) return
    setNotes(selectedLead.internal_notes || "")
    setMonthlyQuote(selectedLead.monthly_quote_cents != null ? (selectedLead.monthly_quote_cents / 100).toString() : "")
    setYearlyQuote(selectedLead.yearly_quote_cents != null ? (selectedLead.yearly_quote_cents / 100).toString() : "")
  }, [selectedLead])

  async function saveLead(status?: Lead["status"]) {
    if (!selectedLead) return
    const payload: Record<string, unknown> = {
      id: selectedLead.id,
      internal_notes: notes,
      monthly_quote_cents: monthlyQuote.trim() === "" ? null : Math.round(Number(monthlyQuote) * 100),
      yearly_quote_cents: yearlyQuote.trim() === "" ? null : Math.round(Number(yearlyQuote) * 100),
    }
    if (status) payload.status = status
    await fetch("/api/admin/founders-leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    await loadLeads()
  }

  async function convertLead() {
    if (!selectedLead || !convertPassword) return
    setConvertLoading(true)
    try {
      const res = await fetch("/api/admin/founders-leads/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: selectedLead.id, password: convertPassword }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error || "Conversion failed")
        return
      }
      setConvertPassword("")
      await loadLeads()
      alert("Lead converted to Founders user")
    } finally {
      setConvertLoading(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Founders Leads</h1>
        <p className="text-muted-foreground mt-1">Qualify incoming custom-pricing prospects and convert to Founders users.</p>
      </div>

      <div className="flex items-center gap-3">
        <Label>Status</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="closed_won">Closed won</SelectItem>
            <SelectItem value="closed_lost">Closed lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Lead inbox</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leads found.</p>
            ) : (
              leads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => setSelectedId(lead.id)}
                  className={`w-full text-left rounded-md border p-3 transition-colors ${
                    selectedId === lead.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{lead.name}</p>
                    <Badge variant="outline">{lead.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{lead.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(lead.created_at).toLocaleString()}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Lead detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedLead ? (
              <p className="text-sm text-muted-foreground">Select a lead to review.</p>
            ) : (
              <>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {selectedLead.name}</p>
                  <p><span className="text-muted-foreground">Email:</span> {selectedLead.email}</p>
                  <p><span className="text-muted-foreground">Company:</span> {selectedLead.company_name || "—"}</p>
                  <p><span className="text-muted-foreground">Company size:</span> {selectedLead.company_size || "—"}</p>
                  <p><span className="text-muted-foreground">Budget:</span> {selectedLead.budget_range || "—"}</p>
                  <p><span className="text-muted-foreground">Timeline:</span> {selectedLead.timeline || "—"}</p>
                </div>

                <div className="rounded-md border border-border p-3 text-sm">
                  {selectedLead.message}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Monthly quote (USD)</Label>
                    <Input value={monthlyQuote} onChange={(e) => setMonthlyQuote(e.target.value)} placeholder="1500" />
                  </div>
                  <div className="space-y-2">
                    <Label>Yearly quote (USD)</Label>
                    <Input value={yearlyQuote} onChange={(e) => setYearlyQuote(e.target.value)} placeholder="15000" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Internal notes</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Call notes / objections / next steps" />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => saveLead("contacted")}>Mark contacted</Button>
                  <Button variant="outline" onClick={() => saveLead("qualified")}>Mark qualified</Button>
                  <Button variant="outline" onClick={() => saveLead("closed_lost")}>Mark closed lost</Button>
                  <Button onClick={() => saveLead()}>Save details</Button>
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <Label>Temporary password for converted account</Label>
                  <Input
                    type="password"
                    value={convertPassword}
                    onChange={(e) => setConvertPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                  <Button
                    disabled={convertLoading || selectedLead.converted_user_id != null}
                    onClick={convertLead}
                  >
                    {selectedLead.converted_user_id ? "Already converted" : convertLoading ? "Converting..." : "Convert to Founders user"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
