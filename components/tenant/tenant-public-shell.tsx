import Link from "next/link"
import type { BrandedPublicContext } from "@/lib/branded-public"
import { TenantPublicNavLogo } from "@/components/tenant/tenant-public-nav-logo"

type Props = {
  ctx: BrandedPublicContext
  children: React.ReactNode
}

export function TenantPublicShell({ ctx, children }: Props) {
  const brand = ctx.brand_name || "Workspace"
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-6">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <TenantPublicNavLogo logoUrl={ctx.logo_url} brandName={brand} />
            <span className="font-display font-semibold text-foreground truncate">{brand}</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-3 text-sm text-muted-foreground">
            <Link href="/auth/login" className="hover:text-foreground">
              Sign in
            </Link>
            <Link href="/auth/sign-up" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
            <Link href="/support" className="hover:text-foreground">
              Support
            </Link>
            {ctx.privacy_policy_url && (
              <a href={ctx.privacy_policy_url} className="hover:text-foreground" rel="noreferrer" target="_blank">
                Privacy
              </a>
            )}
            {!ctx.privacy_policy_url && (
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
            )}
            {ctx.terms_of_service_url && (
              <a href={ctx.terms_of_service_url} className="hover:text-foreground" rel="noreferrer" target="_blank">
                Terms
              </a>
            )}
            {!ctx.terms_of_service_url && (
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
            )}
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-5xl px-6 space-y-2">
          {ctx.support_email && (
            <p>
              Questions?{" "}
              <a href={`mailto:${ctx.support_email}`} className="text-primary hover:underline">
                {ctx.support_email}
              </a>
            </p>
          )}
          {!ctx.remove_247_branding && (
            <p className="text-xs">
              Powered by{" "}
              <a href="https://www.247aiemployees.net" className="text-primary hover:underline" rel="noreferrer">
                247 AI Employees
              </a>
            </p>
          )}
        </div>
      </footer>
    </div>
  )
}
