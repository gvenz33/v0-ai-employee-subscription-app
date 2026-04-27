export interface TenantResolution {
  host: string
  slug: string
  user_id: string
  is_active: boolean
}

export function normalizeHost(rawHost: string | null): string {
  if (!rawHost) return ""
  return rawHost.toLowerCase().split(":")[0]
}

export function getRootDomain(): string {
  return (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "247aiemployees.net").toLowerCase()
}

export function isPlatformHost(host: string): boolean {
  const root = getRootDomain()
  if (!host) return true
  if (host === "localhost" || host.endsWith(".localhost")) return true
  if (host === root || host === `www.${root}`) return true
  if (host.endsWith(".vercel.app")) return true
  return false
}

export function parseTenantSlugFromHost(host: string): string | null {
  const root = getRootDomain()
  if (!host.endsWith(`.${root}`)) return null
  const slug = host.slice(0, -(`.${root}`.length))
  if (!slug || slug.includes(".")) return null
  if (slug === "www") return null
  return slug
}

export function normalizeTenantSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

