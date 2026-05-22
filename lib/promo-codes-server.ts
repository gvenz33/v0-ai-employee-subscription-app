import "server-only"

import { getSupabaseAdmin } from "@/lib/supabase/admin"
import {
  normalizePromoCode,
  type PromoCodeRow,
  validatePromoForCheckout,
  type PromoValidationContext,
  type PromoValidationResult,
} from "@/lib/promo-codes"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function promoTable() {
  return (getSupabaseAdmin() as any).from("promo_codes")
}

export async function getPromoCodeByCode(code: string): Promise<PromoCodeRow | null> {
  const normalized = normalizePromoCode(code)
  if (!normalized) return null

  const { data, error } = await promoTable()
    .select("*")
    .eq("code", normalized)
    .maybeSingle()

  if (error || !data) return null
  return data as PromoCodeRow
}

export async function getPromoCodeById(id: string): Promise<PromoCodeRow | null> {
  const { data, error } = await promoTable().select("*").eq("id", id).maybeSingle()
  if (error || !data) return null
  return data as PromoCodeRow
}

export async function resolvePromoForCheckout(
  code: string | undefined,
  ctx: PromoValidationContext,
): Promise<PromoValidationResult | { ok: true; promo: null }> {
  if (!code?.trim()) return { ok: true, promo: null }
  const promo = await getPromoCodeByCode(code)
  if (!promo) return { ok: false, error: "Invalid promo code" }
  return validatePromoForCheckout(promo, ctx)
}

export async function incrementPromoRedemption(promoId: string): Promise<void> {
  const promo = await getPromoCodeById(promoId)
  if (!promo) return
  await promoTable()
    .update({
      redemption_count: promo.redemption_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", promoId)
}
