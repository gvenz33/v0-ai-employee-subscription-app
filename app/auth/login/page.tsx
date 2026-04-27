import type { Metadata } from "next"
import { headers } from "next/headers"
import { normalizeHost } from "@/lib/tenancy"
import { getBrandedPublicContextForHost } from "@/lib/branded-public"
import { getAuthBrandForRequest } from "@/lib/auth-branding"
import { LoginForm } from "@/components/auth/login-form"

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const host = normalizeHost(h.get("x-forwarded-host") || h.get("host") || "")
  const ctx = await getBrandedPublicContextForHost(host)
  if (ctx?.branded_auth_enabled && ctx.brand_name) {
    return { title: `Sign in · ${ctx.brand_name}` }
  }
  return { title: "Sign in · 247 AI Employees" }
}

export default async function LoginPage() {
  const brand = await getAuthBrandForRequest()
  return <LoginForm brand={brand} />
}
