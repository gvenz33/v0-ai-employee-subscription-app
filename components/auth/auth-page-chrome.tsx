"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { AuthBrandPresentation } from "@/lib/auth-branding"

type Props = {
  brand: AuthBrandPresentation
  backHref?: string
  backLabel?: string
  children: React.ReactNode
}

export function AuthPageChrome({ brand, backHref = "/", backLabel = "Back to home", children }: Props) {
  const useTenantLogo = brand.applyBranding && brand.logoUrl && /^https?:\/\//i.test(brand.logoUrl)
  const title = brand.applyBranding && brand.brandName ? brand.brandName : "247 AI Employees"

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-background p-6 md:p-10"
      style={
        brand.applyBranding && brand.primaryColor ?
          { ["--ring" as string]: brand.primaryColor }
        : undefined
      }
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Link
            href={backHref}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>

          <div className="flex justify-center">
            {useTenantLogo ?
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl!}
                alt=""
                className="h-20 w-auto max-w-[200px] object-contain"
              />
            : <Image
                src="/images/logo.png"
                alt={title}
                width={80}
                height={80}
                className="h-20 w-auto"
              />
            }
          </div>
          {brand.applyBranding && !brand.remove247Branding && (
            <p className="text-center text-xs text-muted-foreground">Powered by 247 AI Employees</p>
          )}

          {children}
        </div>
      </div>
    </div>
  )
}
