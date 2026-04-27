"use client"

import Image from "next/image"

type Props = {
  logoUrl: string | null
  brandName: string
}

export function TenantHeroLogo({ logoUrl, brandName }: Props) {
  if (logoUrl && /^https?:\/\//i.test(logoUrl)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className="h-24 w-auto max-w-[min(100%,280px)] object-contain md:h-32"
      />
    )
  }
  return (
    <Image
      src="/images/logo-transparent.png"
      alt={brandName}
      width={600}
      height={600}
      className="h-48 w-auto md:h-64"
      priority
    />
  )
}
