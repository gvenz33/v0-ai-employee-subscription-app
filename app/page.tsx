import { headers } from "next/headers"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { normalizeHost } from "@/lib/tenancy"
import { getBrandedPublicContextForHost } from "@/lib/branded-public"
import { siteDefaultMetadata } from "@/lib/site-metadata"
import { MarketingHome } from "@/components/landing/marketing-home"
import { TenantBrandedLanding } from "@/components/tenant/tenant-branded-landing"

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const host = normalizeHost(h.get("x-forwarded-host") || h.get("host") || "")
  const ctx = await getBrandedPublicContextForHost(host)
  if (ctx?.page_title || ctx?.meta_description || ctx?.og_image_url) {
    return {
      title: ctx.page_title || ctx.brand_name || siteDefaultMetadata.title,
      description: ctx.meta_description || (typeof siteDefaultMetadata.description === "string" ? siteDefaultMetadata.description : undefined),
      openGraph: ctx.og_image_url ? { images: [{ url: ctx.og_image_url }] } : undefined,
    }
  }
  return siteDefaultMetadata
}

export default async function Home() {
  const h = await headers()
  const tenantId = h.get("x-tenant-id")
  const host = normalizeHost(h.get("x-forwarded-host") || h.get("host") || "")
  const ctx = await getBrandedPublicContextForHost(host)

  if (tenantId && !ctx) {
    redirect("/auth/login")
  }

  if (ctx?.public_landing_enabled) {
    return <TenantBrandedLanding ctx={ctx} />
  }

  if (tenantId && ctx && !ctx.public_landing_enabled) {
    redirect("/auth/login")
  }

  return <MarketingHome />
}
