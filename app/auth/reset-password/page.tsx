import type { Metadata } from "next"
import { headers } from "next/headers"
import { normalizeHost } from "@/lib/tenancy"
import { getBrandedPublicContextForHost } from "@/lib/branded-public"
import { getAuthBrandForRequest } from "@/lib/auth-branding"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const host = normalizeHost(h.get("x-forwarded-host") || h.get("host") || "")
  const ctx = await getBrandedPublicContextForHost(host)
  if (ctx?.branded_auth_enabled && ctx.brand_name) {
    return { title: `Reset password · ${ctx.brand_name}` }
  }
  return { title: "Reset password · 247 AI Employees" }
}

export default async function ResetPasswordPage() {
  const brand = await getAuthBrandForRequest()
  return <ResetPasswordForm brand={brand} />
}
