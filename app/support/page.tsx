import type { Metadata } from "next"
import Link from "next/link"
import { headers } from "next/headers"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { normalizeHost } from "@/lib/tenancy"
import { getBrandedPublicContextForHost } from "@/lib/branded-public"
import { TenantPublicShell } from "@/components/tenant/tenant-public-shell"

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers()
  const host = normalizeHost(h.get("x-forwarded-host") || h.get("host") || "")
  const ctx = await getBrandedPublicContextForHost(host)
  if (ctx?.brand_name) {
    return { title: `Support · ${ctx.brand_name}` }
  }
  return { title: "Support · 247 AI Employees" }
}

export default async function SupportPage() {
  const h = await headers()
  const host = normalizeHost(h.get("x-forwarded-host") || h.get("host") || "")
  const ctx = await getBrandedPublicContextForHost(host)
  const md = ctx?.support_page_markdown?.trim()

  if (ctx && md) {
    const paragraphs = md.split(/\n\n+/).filter(Boolean)
    return (
      <TenantPublicShell ctx={ctx}>
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-3xl font-display font-bold text-foreground mb-8">Support</h1>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </TenantPublicShell>
    )
  }

  if (ctx && ctx.support_email) {
    return (
      <TenantPublicShell ctx={ctx}>
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h1 className="text-3xl font-display font-bold text-foreground mb-4">Support</h1>
          <p className="text-muted-foreground mb-6">Reach your team at</p>
          <a href={`mailto:${ctx.support_email}`} className="text-lg font-medium text-primary hover:underline">
            {ctx.support_email}
          </a>
        </div>
      </TenantPublicShell>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-display font-bold text-foreground mb-4">Support</h1>
        <p className="text-muted-foreground mb-6">
          Need help? Visit our{" "}
          <Link href="/contact" className="text-primary hover:underline">
            contact page
          </Link>{" "}
          or sign in and use in-app chat.
        </p>
      </main>
      <Footer />
    </div>
  )
}
