import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

export interface WhiteLabelSettings {
  enabled: boolean
  brand_name: string | null
  logo_url: string | null
  support_email: string | null
  primary_color: string | null
  remove_247_branding: boolean
}

export async function getEffectiveWhiteLabelSettings(
  supabase: SupabaseClient,
  userId: string
): Promise<WhiteLabelSettings | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .single()

  if (profile?.subscription_tier !== "enterprise") {
    return null
  }

  const { data } = await supabase
    .from("user_white_label_settings")
    .select("enabled, brand_name, logo_url, support_email, primary_color, remove_247_branding")
    .eq("user_id", userId)
    .maybeSingle()

  if (!data?.enabled) {
    return null
  }

  return {
    enabled: true,
    brand_name: data.brand_name ?? null,
    logo_url: data.logo_url ?? null,
    support_email: data.support_email ?? null,
    primary_color: data.primary_color ?? null,
    remove_247_branding: Boolean(data.remove_247_branding),
  }
}

