import "server-only"

import { createClient } from "@/lib/supabase/server"

export type BrandedPublicContext = {
  user_id: string
  brand_name: string | null
  logo_url: string | null
  primary_color: string | null
  support_email: string | null
  remove_247_branding: boolean
  public_landing_enabled: boolean
  branded_auth_enabled: boolean
  page_title: string | null
  meta_description: string | null
  og_image_url: string | null
  privacy_policy_url: string | null
  terms_of_service_url: string | null
  hero_headline: string | null
  hero_subheadline: string | null
  hero_primary_cta_label: string | null
  hero_primary_cta_href: string | null
  support_page_markdown: string | null
}

function parseBrandedContext(raw: unknown): BrandedPublicContext | null {
  if (raw == null || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const userId = o.user_id
  if (typeof userId !== "string") return null
  return {
    user_id: userId,
    brand_name: (o.brand_name as string) ?? null,
    logo_url: (o.logo_url as string) ?? null,
    primary_color: (o.primary_color as string) ?? null,
    support_email: (o.support_email as string) ?? null,
    remove_247_branding: Boolean(o.remove_247_branding),
    public_landing_enabled: Boolean(o.public_landing_enabled),
    branded_auth_enabled: o.branded_auth_enabled !== false,
    page_title: (o.page_title as string) ?? null,
    meta_description: (o.meta_description as string) ?? null,
    og_image_url: (o.og_image_url as string) ?? null,
    privacy_policy_url: (o.privacy_policy_url as string) ?? null,
    terms_of_service_url: (o.terms_of_service_url as string) ?? null,
    hero_headline: (o.hero_headline as string) ?? null,
    hero_subheadline: (o.hero_subheadline as string) ?? null,
    hero_primary_cta_label: (o.hero_primary_cta_label as string) ?? null,
    hero_primary_cta_href: (o.hero_primary_cta_href as string) ?? null,
    support_page_markdown: (o.support_page_markdown as string) ?? null,
  }
}

export async function getBrandedPublicContextForHost(host: string): Promise<BrandedPublicContext | null> {
  const normalized = host.trim().toLowerCase()
  if (!normalized) return null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("get_branded_public_context", { p_host: normalized })
    if (error) {
      console.error("[branded-public] get_branded_public_context:", error.message)
      return null
    }
    return parseBrandedContext(data)
  } catch (e) {
    console.error("[branded-public] getBrandedPublicContextForHost failed:", e)
    return null
  }
}

export async function shouldShowSupportChatWidget(): Promise<boolean> {
  const { headers } = await import("next/headers")
  const h = await headers()
  const host = (h.get("x-forwarded-host") || h.get("host") || "").trim()
  const ctx = await getBrandedPublicContextForHost(host)
  if (!ctx) return true
  return !ctx.remove_247_branding
}
