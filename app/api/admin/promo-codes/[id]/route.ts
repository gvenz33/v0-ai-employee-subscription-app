import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { normalizePromoCode } from "@/lib/promo-codes"
import {
  deactivateStripePromotionCode,
  setStripePromotionCodeActive,
  syncPromoToStripe,
} from "@/lib/stripe-promo-sync"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function promoTable() {
  return (getSupabaseAdmin() as any).from("promo_codes")
}

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response

  const { id } = await context.params
  const body = await request.json().catch(() => ({}))

  const { data: existing, error: fetchError } = await promoTable()
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!existing) return NextResponse.json({ error: "Promo code not found" }, { status: 404 })

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof body.code === "string") {
    const code = normalizePromoCode(body.code)
    if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 })
    updates.code = code
  }
  if (typeof body.name === "string") {
    const name = body.name.trim()
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })
    updates.name = name
  }
  if (typeof body.description === "string" || body.description === null) {
    updates.description = body.description === null ? null : body.description.trim() || null
  }
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active
  if (body.starts_at !== undefined) updates.starts_at = body.starts_at || null
  if (body.ends_at !== undefined) updates.ends_at = body.ends_at || null
  if (body.discount_type === "percent" || body.discount_type === "fixed_amount") {
    updates.discount_type = body.discount_type
  }
  if (body.discount_percent !== undefined) {
    updates.discount_percent =
      body.discount_percent === null ? null : Number(body.discount_percent)
  }
  if (body.discount_amount_cents !== undefined) {
    updates.discount_amount_cents =
      body.discount_amount_cents === null ? null : Number(body.discount_amount_cents)
  }
  if (Array.isArray(body.eligible_plan_ids)) {
    updates.eligible_plan_ids = body.eligible_plan_ids
  }
  if (Array.isArray(body.billing_intervals)) {
    updates.billing_intervals = body.billing_intervals
  }
  if (body.max_redemptions !== undefined) {
    updates.max_redemptions =
      body.max_redemptions === null || body.max_redemptions === ""
        ? null
        : Number(body.max_redemptions)
  }
  if (typeof body.requires_beta_terms === "boolean") {
    updates.requires_beta_terms = body.requires_beta_terms
  }
  if (typeof body.internal_notes === "string" || body.internal_notes === null) {
    updates.internal_notes =
      body.internal_notes === null ? null : body.internal_notes.trim() || null
  }
  if (typeof body.stripe_coupon_id === "string" || body.stripe_coupon_id === null) {
    updates.stripe_coupon_id =
      body.stripe_coupon_id === null ? null : body.stripe_coupon_id.trim() || null
  }
  if (
    typeof body.stripe_promotion_code_id === "string" ||
    body.stripe_promotion_code_id === null
  ) {
    updates.stripe_promotion_code_id =
      body.stripe_promotion_code_id === null
        ? null
        : body.stripe_promotion_code_id.trim() || null
  }

  const merged = { ...existing, ...updates }

  if (Boolean(body.sync_to_stripe)) {
    try {
      const synced = await syncPromoToStripe({
        code: merged.code,
        name: merged.name,
        is_active: merged.is_active,
        starts_at: merged.starts_at,
        ends_at: merged.ends_at,
        discount_type: merged.discount_type,
        discount_percent: merged.discount_percent,
        discount_amount_cents: merged.discount_amount_cents,
        max_redemptions: merged.max_redemptions,
        existing_coupon_id: merged.stripe_coupon_id,
        existing_promotion_code_id: merged.stripe_promotion_code_id,
      })
      updates.stripe_coupon_id = synced.stripe_coupon_id
      updates.stripe_promotion_code_id = synced.stripe_promotion_code_id
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stripe sync failed"
      return NextResponse.json({ error: message }, { status: 400 })
    }
  } else if (
    typeof body.is_active === "boolean" &&
    merged.stripe_promotion_code_id
  ) {
    try {
      await setStripePromotionCodeActive(merged.stripe_promotion_code_id, body.is_active)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update Stripe"
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  const { data, error } = await promoTable()
    .update(updates)
    .eq("id", id)
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

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response

  const { id } = await context.params

  const { data: existing } = await promoTable().select("stripe_promotion_code_id").eq("id", id).maybeSingle()

  if (existing?.stripe_promotion_code_id) {
    await deactivateStripePromotionCode(existing.stripe_promotion_code_id)
  }

  const { error } = await promoTable().delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
