import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { normalizePromoCode } from "@/lib/promo-codes"
import { syncPromoToStripe } from "@/lib/stripe-promo-sync"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function promoTable() {
  return (getSupabaseAdmin() as any).from("promo_codes")
}

function parsePromoBody(body: Record<string, unknown>) {
  const code = normalizePromoCode(String(body.code || ""))
  if (!code) return { error: "Code is required" }

  const name = String(body.name || "").trim()
  if (!name) return { error: "Name is required" }

  const discount_type = body.discount_type === "fixed_amount" ? "fixed_amount" : "percent"
  const discount_percent =
    body.discount_percent === null || body.discount_percent === undefined
      ? null
      : Number(body.discount_percent)
  const discount_amount_cents =
    body.discount_amount_cents === null || body.discount_amount_cents === undefined
      ? null
      : Number(body.discount_amount_cents)

  if (discount_type === "percent") {
    if (
      discount_percent == null ||
      Number.isNaN(discount_percent) ||
      discount_percent <= 0 ||
      discount_percent > 100
    ) {
      return { error: "Valid discount percent (1–100) is required" }
    }
  } else if (
    discount_amount_cents == null ||
    Number.isNaN(discount_amount_cents) ||
    discount_amount_cents <= 0
  ) {
    return { error: "Valid discount amount in cents is required" }
  }

  const eligible_plan_ids = Array.isArray(body.eligible_plan_ids)
    ? (body.eligible_plan_ids as string[]).map(String)
    : []
  const billing_intervals = Array.isArray(body.billing_intervals)
    ? (body.billing_intervals as string[]).map(String)
    : ["month", "year"]

  const max_redemptions =
    body.max_redemptions === null || body.max_redemptions === undefined || body.max_redemptions === ""
      ? null
      : Number(body.max_redemptions)
  if (max_redemptions != null && (Number.isNaN(max_redemptions) || max_redemptions <= 0)) {
    return { error: "Max redemptions must be a positive number" }
  }

  const starts_at = body.starts_at ? String(body.starts_at) : null
  const ends_at = body.ends_at ? String(body.ends_at) : null

  return {
    row: {
      code,
      name,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      is_active: body.is_active !== false,
      starts_at,
      ends_at,
      discount_type,
      discount_percent: discount_type === "percent" ? discount_percent : null,
      discount_amount_cents:
        discount_type === "fixed_amount" ? discount_amount_cents : null,
      eligible_plan_ids,
      billing_intervals,
      max_redemptions,
      requires_beta_terms: Boolean(body.requires_beta_terms),
      internal_notes:
        typeof body.internal_notes === "string" ? body.internal_notes.trim() || null : null,
      stripe_coupon_id:
        typeof body.stripe_coupon_id === "string" ? body.stripe_coupon_id.trim() || null : null,
      stripe_promotion_code_id:
        typeof body.stripe_promotion_code_id === "string"
          ? body.stripe_promotion_code_id.trim() || null
          : null,
    },
    sync_to_stripe: Boolean(body.sync_to_stripe),
  }
}

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response

  const { data, error } = await promoTable()
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ promo_codes: data || [] })
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response

  const body = await request.json().catch(() => ({}))
  const parsed = parsePromoBody(body)
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { row, sync_to_stripe } = parsed
  const now = new Date().toISOString()
  let stripe_coupon_id = row.stripe_coupon_id
  let stripe_promotion_code_id = row.stripe_promotion_code_id

  if (sync_to_stripe) {
    try {
      const synced = await syncPromoToStripe({
        code: row.code,
        name: row.name,
        is_active: row.is_active,
        starts_at: row.starts_at,
        ends_at: row.ends_at,
        discount_type: row.discount_type,
        discount_percent: row.discount_percent,
        discount_amount_cents: row.discount_amount_cents,
        max_redemptions: row.max_redemptions,
      })
      stripe_coupon_id = synced.stripe_coupon_id
      stripe_promotion_code_id = synced.stripe_promotion_code_id
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stripe sync failed"
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  const { data, error } = await promoTable()
    .insert({
      ...row,
      stripe_coupon_id,
      stripe_promotion_code_id,
      created_by: gate.userId,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A promo code with this code already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ promo_code: data })
}
