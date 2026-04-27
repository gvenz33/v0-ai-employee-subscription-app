import "server-only"

import { headers } from "next/headers"
import { normalizeHost } from "@/lib/tenancy"
import { getBrandedPublicContextForHost, type BrandedPublicContext } from "@/lib/branded-public"

export type AuthBrandPresentation = {
  applyBranding: boolean
  brandName: string | null
  logoUrl: string | null
  primaryColor: string | null
  remove247Branding: boolean
}

export function toAuthBrand(ctx: BrandedPublicContext | null): AuthBrandPresentation {
  if (!ctx || !ctx.branded_auth_enabled) {
    return {
      applyBranding: false,
      brandName: null,
      logoUrl: null,
      primaryColor: null,
      remove247Branding: false,
    }
  }
  return {
    applyBranding: true,
    brandName: ctx.brand_name,
    logoUrl: ctx.logo_url,
    primaryColor: ctx.primary_color,
    remove247Branding: ctx.remove_247_branding,
  }
}

export async function getAuthBrandForRequest(): Promise<AuthBrandPresentation> {
  const h = await headers()
  const host = normalizeHost(h.get("x-forwarded-host") || h.get("host") || "")
  const ctx = await getBrandedPublicContextForHost(host)
  return toAuthBrand(ctx)
}
