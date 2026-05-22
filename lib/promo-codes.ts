export type PromoDiscountType = "percent" | "fixed_amount"

export type PromoCodeRow = {
  id: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  discount_type: PromoDiscountType
  discount_percent: number | null
  discount_amount_cents: number | null
  stripe_coupon_id: string | null
  stripe_promotion_code_id: string | null
  eligible_plan_ids: string[]
  billing_intervals: string[]
  max_redemptions: number | null
  redemption_count: number
  requires_beta_terms: boolean
  internal_notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export const PLAN_OPTIONS = [
  { id: "personal", label: "Personal" },
  { id: "entrepreneur", label: "Entrepreneur" },
  { id: "business", label: "Business" },
  { id: "enterprise", label: "Enterprise (Founders)" },
] as const

export const BILLING_INTERVAL_OPTIONS = [
  { id: "month", label: "Monthly" },
  { id: "year", label: "Annual" },
] as const

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase()
}

export type PromoValidationContext = {
  planId: string
  interval: "month" | "year"
  betaEnrollment?: boolean
  now?: Date
}

export type PromoValidationResult =
  | { ok: true; promo: PromoCodeRow }
  | { ok: false; error: string }

export function validatePromoForCheckout(
  promo: PromoCodeRow,
  ctx: PromoValidationContext,
): PromoValidationResult {
  const now = ctx.now ?? new Date()

  if (!promo.is_active) {
    return { ok: false, error: "This promo code is not active" }
  }

  if (promo.starts_at && new Date(promo.starts_at) > now) {
    return { ok: false, error: "This promo code is not valid yet" }
  }

  if (promo.ends_at && new Date(promo.ends_at) < now) {
    return { ok: false, error: "This promo code has expired" }
  }

  if (
    promo.max_redemptions != null &&
    promo.redemption_count >= promo.max_redemptions
  ) {
    return { ok: false, error: "This promo code has reached its redemption limit" }
  }

  if (promo.eligible_plan_ids.length > 0 && !promo.eligible_plan_ids.includes(ctx.planId)) {
    return { ok: false, error: "This promo code does not apply to the selected plan" }
  }

  if (
    promo.billing_intervals.length > 0 &&
    !promo.billing_intervals.includes(ctx.interval)
  ) {
    return { ok: false, error: "This promo code does not apply to the selected billing interval" }
  }

  if (promo.requires_beta_terms && !ctx.betaEnrollment) {
    return {
      ok: false,
      error: "This promo requires accepting the beta program terms before checkout",
    }
  }

  if (!promo.stripe_coupon_id?.trim()) {
    return { ok: false, error: "This promo code is not linked to Stripe yet. Contact support." }
  }

  if (promo.discount_type === "percent") {
    if (promo.discount_percent == null || promo.discount_percent <= 0) {
      return { ok: false, error: "Promo discount is misconfigured" }
    }
  } else if (promo.discount_amount_cents == null || promo.discount_amount_cents <= 0) {
    return { ok: false, error: "Promo discount is misconfigured" }
  }

  return { ok: true, promo }
}

export function formatPromoDiscount(promo: PromoCodeRow): string {
  if (promo.discount_type === "percent" && promo.discount_percent != null) {
    return `${promo.discount_percent}% off`
  }
  if (promo.discount_amount_cents != null) {
    return `$${(promo.discount_amount_cents / 100).toFixed(2)} off`
  }
  return "Discount"
}

export function promoStatusLabel(promo: PromoCodeRow, now = new Date()): string {
  if (!promo.is_active) return "Inactive"
  if (promo.starts_at && new Date(promo.starts_at) > now) return "Scheduled"
  if (promo.ends_at && new Date(promo.ends_at) < now) return "Expired"
  if (
    promo.max_redemptions != null &&
    promo.redemption_count >= promo.max_redemptions
  ) {
    return "Limit reached"
  }
  return "Active"
}
