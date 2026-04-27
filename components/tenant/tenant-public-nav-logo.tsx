"use client"

import Image from "next/image"

type Props = {
  logoUrl: string | null
  brandName: string
}

export function TenantPublicNavLogo({ logoUrl, brandName }: Props) {
  if (logoUrl && /^https?:\/\//i.test(logoUrl)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user-supplied arbitrary URL
      <img
        src={logoUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-md object-contain"
      />
    )
  }
  return (
    <Image
      src="/images/logo.png"
      alt={brandName}
      width={36}
      height={36}
      className="h-9 w-auto shrink-0"
    />
  )
}
