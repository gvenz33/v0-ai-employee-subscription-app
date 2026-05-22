import "server-only"

import { getStripe } from "@/lib/stripe"
import type { PromoCodeRow } from "@/lib/promo-codes"
import { normalizePromoCode } from "@/lib/promo-codes"

export type StripePromoSyncInput = {
  code: string
  name: string
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  discount_type: "percent" | "fixed_amount"
  discount_percent: number | null
  discount_amount_cents: number | null
  max_redemptions: number | null
  existing_coupon_id?: string | null
  existing_promotion_code_id?: string | null
}

export type StripePromoSyncResult = {
  stripe_coupon_id: string
  stripe_promotion_code_id: string
}

/** Create or refresh Stripe coupon + promotion code for a DB promo row. */
export async function syncPromoToStripe(
  input: StripePromoSyncInput,
): Promise<StripePromoSyncResult> {
  const stripe = getStripe()
  const code = normalizePromoCode(input.code)

  const couponParams: Parameters<typeof stripe.coupons.create>[0] = {
    name: input.name.slice(0, 40),
    duration: "forever",
  }

  if (input.discount_type === "percent") {
    if (input.discount_percent == null || input.discount_percent <= 0) {
      throw new Error("Percent discount is required")
    }
    couponParams.percent_off = input.discount_percent
  } else {
    if (input.discount_amount_cents == null || input.discount_amount_cents <= 0) {
      throw new Error("Fixed discount amount is required")
    }
    couponParams.amount_off = input.discount_amount_cents
    couponParams.currency = "usd"
  }

  let couponId = input.existing_coupon_id?.trim() || null

  if (couponId) {
    try {
      await stripe.coupons.del(couponId)
    } catch {
      /* coupon may already be deleted or in use — create fresh */
      couponId = null
    }
  }

  const coupon = await stripe.coupons.create(couponParams)
  couponId = coupon.id

  if (input.existing_promotion_code_id?.trim()) {
    try {
      await stripe.promotionCodes.update(input.existing_promotion_code_id, {
        active: false,
      })
    } catch {
      /* ignore */
    }
  }

  const expiresAt =
    input.ends_at != null ? Math.floor(new Date(input.ends_at).getTime() / 1000) : undefined

  const promotionCode = await stripe.promotionCodes.create({
    coupon: couponId,
    code,
    active: input.is_active,
    ...(input.max_redemptions != null
      ? { max_redemptions: input.max_redemptions }
      : {}),
    ...(expiresAt != null ? { expires_at: expiresAt } : {}),
  })

  return {
    stripe_coupon_id: couponId,
    stripe_promotion_code_id: promotionCode.id,
  }
}

export async function setStripePromotionCodeActive(
  promotionCodeId: string,
  active: boolean,
): Promise<void> {
  await getStripe().promotionCodes.update(promotionCodeId, { active })
}

export async function deactivateStripePromotionCode(
  promotionCodeId: string | null | undefined,
): Promise<void> {
  if (!promotionCodeId?.trim()) return
  try {
    await setStripePromotionCodeActive(promotionCodeId, false)
  } catch {
    /* ignore */
  }
}

export function rowToStripeSyncInput(row: PromoCodeRow): StripePromoSyncInput {
  return {
    code: row.code,
    name: row.name,
    is_active: row.is_active,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    discount_type: row.discount_type,
    discount_percent: row.discount_percent,
    discount_amount_cents: row.discount_amount_cents,
    max_redemptions: row.max_redemptions,
    existing_coupon_id: row.stripe_coupon_id,
    existing_promotion_code_id: row.stripe_promotion_code_id,
  }
}
