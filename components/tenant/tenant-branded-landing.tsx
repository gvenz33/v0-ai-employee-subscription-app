import type { CSSProperties } from "react"
import Link from "next/link"
import type { BrandedPublicContext } from "@/lib/branded-public"
import { TenantPublicShell } from "@/components/tenant/tenant-public-shell"
import { Button } from "@/components/ui/button"
import { TenantHeroLogo } from "@/components/tenant/tenant-hero-logo"

type Props = {
  ctx: BrandedPublicContext
}

function resolveCta(ctx: BrandedPublicContext): { label: string; href: string; external: boolean } {
  const label = ctx.hero_primary_cta_label?.trim() || "Get started"
  const raw = ctx.hero_primary_cta_href?.trim() || "/auth/sign-up"
  const external = /^https?:\/\//i.test(raw)
  return { label, href: raw, external }
}

export function TenantBrandedLanding({ ctx }: Props) {
  const brand = ctx.brand_name || "Your workspace"
  const headline =
    ctx.hero_headline?.trim() ||
    `Welcome to ${brand}`
  const sub = ctx.hero_subheadline?.trim() || "Sign in to manage your AI employees and automations."
  const cta = resolveCta(ctx)
  const style: CSSProperties | undefined =
    ctx.primary_color ? { ["--tenant-primary" as string]: ctx.primary_color } : undefined

  return (
    <TenantPublicShell ctx={ctx}>
      <section
        className="relative overflow-hidden px-6 py-20 md:py-28"
        style={style}
      >
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-30"
          style={
            ctx.primary_color ?
              {
                background: `radial-gradient(ellipse at top, ${ctx.primary_color}33, transparent 55%)`,
              }
            : undefined
          }
        />
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-10 flex justify-center">
            <TenantHeroLogo logoUrl={ctx.logo_url} brandName={brand} />
          </div>
          <h1 className="font-display text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            {headline}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground leading-relaxed">
            {sub}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {cta.external ?
              <Button asChild size="lg" className="text-base">
                <a href={cta.href} rel="noreferrer" target="_blank">
                  {cta.label}
                </a>
              </Button>
            : <Button asChild size="lg" className="text-base">
                <Link href={cta.href}>{cta.label}</Link>
              </Button>
            }
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>
    </TenantPublicShell>
  )
}
