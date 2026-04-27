/** Normalize hostname for storage (no scheme, no port, lowercase). */
export function normalizeHostname(raw: string): string {
  let h = raw.trim().toLowerCase()
  try {
    if (h.includes("://")) {
      const u = new URL(h)
      h = u.hostname
    }
  } catch {
    /* ignore */
  }
  h = h.split(":")[0].replace(/^\.+|\.+$/g, "")
  return h
}

/** Basic RFC-ish hostname validation for customer-entered domains (single hostname only). */
export function isValidHostname(hostname: string): boolean {
  if (hostname.length < 4 || hostname.length > 253) return false
  if (!hostname.includes(".")) return false
  if (hostname.startsWith("-") || hostname.endsWith("-")) return false
  // Avoid localhost / IP literals as custom domains
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return false
  const labels = hostname.split(".")
  if (labels.some((l) => l.length === 0 || l.length > 63)) return false
  return /^[a-z0-9.-]+$/.test(hostname)
}
