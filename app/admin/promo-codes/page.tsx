"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react"
import {
  BILLING_INTERVAL_OPTIONS,
  PLAN_OPTIONS,
  formatPromoDiscount,
  promoStatusLabel,
  type PromoCodeRow,
} from "@/lib/promo-codes"

type PromoFormState = {
  code: string
  name: string
  description: string
  is_active: boolean
  starts_at: string
  ends_at: string
  discount_type: "percent" | "fixed_amount"
  discount_percent: string
  discount_amount_dollars: string
  eligible_plan_ids: string[]
  billing_intervals: string[]
  max_redemptions: string
  requires_beta_terms: boolean
  internal_notes: string
  stripe_coupon_id: string
  stripe_promotion_code_id: string
  sync_to_stripe: boolean
}

const emptyForm = (): PromoFormState => ({
  code: "",
  name: "",
  description: "",
  is_active: true,
  starts_at: "",
  ends_at: "",
  discount_type: "percent",
  discount_percent: "50",
  discount_amount_dollars: "",
  eligible_plan_ids: ["entrepreneur", "business"],
  billing_intervals: ["year"],
  max_redemptions: "",
  requires_beta_terms: false,
  internal_notes: "",
  stripe_coupon_id: "",
  stripe_promotion_code_id: "",
  sync_to_stripe: true,
})

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(value: string): string | null {
  if (!value.trim()) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function rowToForm(row: PromoCodeRow): PromoFormState {
  return {
    code: row.code,
    name: row.name,
    description: row.description || "",
    is_active: row.is_active,
    starts_at: toDatetimeLocal(row.starts_at),
    ends_at: toDatetimeLocal(row.ends_at),
    discount_type: row.discount_type,
    discount_percent: row.discount_percent != null ? String(row.discount_percent) : "",
    discount_amount_dollars:
      row.discount_amount_cents != null ? String(row.discount_amount_cents / 100) : "",
    eligible_plan_ids: [...row.eligible_plan_ids],
    billing_intervals: [...row.billing_intervals],
    max_redemptions: row.max_redemptions != null ? String(row.max_redemptions) : "",
    requires_beta_terms: row.requires_beta_terms,
    internal_notes: row.internal_notes || "",
    stripe_coupon_id: row.stripe_coupon_id || "",
    stripe_promotion_code_id: row.stripe_promotion_code_id || "",
    sync_to_stripe: false,
  }
}

function formToPayload(form: PromoFormState) {
  return {
    code: form.code,
    name: form.name,
    description: form.description,
    is_active: form.is_active,
    starts_at: fromDatetimeLocal(form.starts_at),
    ends_at: fromDatetimeLocal(form.ends_at),
    discount_type: form.discount_type,
    discount_percent:
      form.discount_type === "percent" && form.discount_percent.trim() !== ""
        ? Number(form.discount_percent)
        : null,
    discount_amount_cents:
      form.discount_type === "fixed_amount" && form.discount_amount_dollars.trim() !== ""
        ? Math.round(Number(form.discount_amount_dollars) * 100)
        : null,
    eligible_plan_ids: form.eligible_plan_ids,
    billing_intervals: form.billing_intervals,
    max_redemptions: form.max_redemptions.trim() === "" ? null : Number(form.max_redemptions),
    requires_beta_terms: form.requires_beta_terms,
    internal_notes: form.internal_notes,
    stripe_coupon_id: form.stripe_coupon_id.trim() || null,
    stripe_promotion_code_id: form.stripe_promotion_code_id.trim() || null,
    sync_to_stripe: form.sync_to_stripe,
  }
}

export default function AdminPromoCodesPage() {
  const [promos, setPromos] = useState<PromoCodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PromoFormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const loadPromos = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/promo-codes")
    if (res.ok) {
      const body = await res.json()
      setPromos(body.promo_codes || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadPromos()
  }, [loadPromos])

  const editingRow = useMemo(
    () => promos.find((p) => p.id === editingId) ?? null,
    [promos, editingId],
  )

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setError(null)
    setDialogOpen(true)
  }

  function openEdit(row: PromoCodeRow) {
    setEditingId(row.id)
    setForm(rowToForm(row))
    setError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload = formToPayload(form)
      const url = editingId ? `/api/admin/promo-codes/${editingId}` : "/api/admin/promo-codes"
      const method = editingId ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error || "Failed to save promo code")
        return
      }
      setDialogOpen(false)
      await loadPromos()
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(row: PromoCodeRow) {
    await fetch(`/api/admin/promo-codes/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !row.is_active }),
    })
    await loadPromos()
  }

  async function handleDelete(row: PromoCodeRow) {
    if (!confirm(`Delete promo code "${row.code}"? This deactivates it in Stripe.`)) return
    const res = await fetch(`/api/admin/promo-codes/${row.id}`, { method: "DELETE" })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      alert(body.error || "Delete failed")
      return
    }
    await loadPromos()
  }

  function togglePlan(planId: string) {
    setForm((f) => ({
      ...f,
      eligible_plan_ids: f.eligible_plan_ids.includes(planId)
        ? f.eligible_plan_ids.filter((id) => id !== planId)
        : [...f.eligible_plan_ids, planId],
    }))
  }

  function toggleInterval(interval: string) {
    setForm((f) => ({
      ...f,
      billing_intervals: f.billing_intervals.includes(interval)
        ? f.billing_intervals.filter((id) => id !== interval)
        : [...f.billing_intervals, interval],
    }))
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Promo Codes</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage discount codes, schedules, plan eligibility, and Stripe sync.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add promo code
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>All promo codes</CardTitle>
          <CardDescription>
            Toggle active status inline. Empty plan list = all plans. Sync to Stripe when creating or editing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : promos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No promo codes yet. Add one to get started (e.g. BETA for 50% off annual Pro tiers).
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Redemptions</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promos.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono font-medium">{row.code}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{formatPromoDiscount(row)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{promoStatusLabel(row)}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                        {row.starts_at
                          ? `From ${new Date(row.starts_at).toLocaleDateString()}`
                          : "No start"}
                        <br />
                        {row.ends_at
                          ? `Until ${new Date(row.ends_at).toLocaleDateString()}`
                          : "No end"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.redemption_count}
                        {row.max_redemptions != null ? ` / ${row.max_redemptions}` : ""}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={row.is_active}
                          onCheckedChange={() => toggleActive(row)}
                          aria-label={`Toggle ${row.code}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDelete(row)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit promo code" : "New promo code"}</DialogTitle>
            <DialogDescription>
              {editingRow?.stripe_coupon_id
                ? "Changing discount or code may require re-syncing to Stripe."
                : "Enable “Sync to Stripe” to create the coupon and promotion code automatically."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="promo-code">Code</Label>
              <Input
                id="promo-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="BETA"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-name">Internal name</Label>
              <Input
                id="promo-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Beta testers 50% off"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="promo-desc">Public description (optional)</Label>
              <Textarea
                id="promo-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3 sm:col-span-2">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Inactive codes cannot be used at checkout</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="starts-at">Start date (optional)</Label>
              <Input
                id="starts-at"
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends-at">End date (optional)</Label>
              <Input
                id="ends-at"
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Discount type</Label>
              <Select
                value={form.discount_type}
                onValueChange={(v: "percent" | "fixed_amount") =>
                  setForm((f) => ({ ...f, discount_type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent off</SelectItem>
                  <SelectItem value="fixed_amount">Fixed amount off (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {form.discount_type === "percent" ? (
                <>
                  <Label htmlFor="discount-percent">Percent off</Label>
                  <Input
                    id="discount-percent"
                    type="number"
                    min={1}
                    max={100}
                    value={form.discount_percent}
                    onChange={(e) => setForm((f) => ({ ...f, discount_percent: e.target.value }))}
                  />
                </>
              ) : (
                <>
                  <Label htmlFor="discount-fixed">Amount off ($)</Label>
                  <Input
                    id="discount-fixed"
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={form.discount_amount_dollars}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discount_amount_dollars: e.target.value }))
                    }
                  />
                </>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Eligible plans (none selected = all plans)</Label>
              <div className="flex flex-wrap gap-3">
                {PLAN_OPTIONS.map((plan) => (
                  <label key={plan.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.eligible_plan_ids.includes(plan.id)}
                      onCheckedChange={() => togglePlan(plan.id)}
                    />
                    {plan.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Billing intervals</Label>
              <div className="flex flex-wrap gap-3">
                {BILLING_INTERVAL_OPTIONS.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.billing_intervals.includes(opt.id)}
                      onCheckedChange={() => toggleInterval(opt.id)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-redemptions">Max redemptions (optional)</Label>
              <Input
                id="max-redemptions"
                type="number"
                min={1}
                value={form.max_redemptions}
                onChange={(e) => setForm((f) => ({ ...f, max_redemptions: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="beta-terms"
                checked={form.requires_beta_terms}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, requires_beta_terms: v === true }))
                }
              />
              <Label htmlFor="beta-terms" className="font-normal cursor-pointer">
                Requires beta program checkbox before checkout
              </Label>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="internal-notes">Internal notes</Label>
              <Textarea
                id="internal-notes"
                value={form.internal_notes}
                onChange={(e) => setForm((f) => ({ ...f, internal_notes: e.target.value }))}
                rows={2}
              />
            </div>

            {editingId && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="stripe-coupon">Stripe coupon ID</Label>
                  <Input
                    id="stripe-coupon"
                    value={form.stripe_coupon_id}
                    onChange={(e) => setForm((f) => ({ ...f, stripe_coupon_id: e.target.value }))}
                    placeholder="Auto-filled after sync"
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripe-promo">Stripe promotion code ID</Label>
                  <Input
                    id="stripe-promo"
                    value={form.stripe_promotion_code_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, stripe_promotion_code_id: e.target.value }))
                    }
                    className="font-mono text-xs"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-2 sm:col-span-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
              <Checkbox
                id="sync-stripe"
                checked={form.sync_to_stripe}
                onCheckedChange={(v) => setForm((f) => ({ ...f, sync_to_stripe: v === true }))}
              />
              <Label htmlFor="sync-stripe" className="font-normal cursor-pointer flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                Sync to Stripe (create/update coupon &amp; promotion code)
              </Label>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Create promo code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
