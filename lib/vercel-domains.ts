import "server-only"

function vercelTeamQuery(): string {
  const teamId = process.env.VERCEL_TEAM_ID?.trim()
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : ""
}

function authHeaders(): HeadersInit {
  const token = process.env.VERCEL_TOKEN?.trim()
  if (!token) {
    throw new Error("VERCEL_TOKEN is not configured")
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

export function vercelConfigured(): boolean {
  return Boolean(process.env.VERCEL_TOKEN?.trim() && process.env.VERCEL_PROJECT_ID?.trim())
}

/** Register domain on the Vercel project (starts verification / SSL issuance). */
export async function vercelAddDomainToProject(hostname: string): Promise<unknown> {
  const projectId = process.env.VERCEL_PROJECT_ID?.trim()
  if (!projectId) throw new Error("VERCEL_PROJECT_ID is not configured")

  const url = `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains${vercelTeamQuery()}`
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name: hostname }),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      typeof json.error?.message === "string"
        ? json.error.message
        : typeof json.message === "string"
          ? json.message
          : `Vercel API error (${res.status})`
    throw new Error(msg)
  }
  return json
}

/** Fetch domain configuration / verification status from Vercel (best-effort URL variants). */
export async function vercelGetDomainConfig(hostname: string): Promise<unknown | null> {
  const projectId = process.env.VERCEL_PROJECT_ID?.trim()
  const team = vercelTeamQuery()
  const candidates = [
    `https://api.vercel.com/v10/domains/${encodeURIComponent(hostname)}${team}`,
  ]
  if (projectId) {
    candidates.push(
      `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(hostname)}${team}`,
    )
  }

  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: authHeaders(), cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (res.ok) return json
    } catch {
      /* try next */
    }
  }
  return null
}

export async function vercelRemoveDomainFromProject(hostname: string): Promise<void> {
  const projectId = process.env.VERCEL_PROJECT_ID?.trim()
  if (!projectId) return

  const url = `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(hostname)}${vercelTeamQuery()}`

  const res = await fetch(url, {
    method: "DELETE",
    headers: authHeaders(),
  })
  if (!res.ok && res.status !== 404) {
    const json = await res.json().catch(() => ({}))
    const msg =
      typeof json.error?.message === "string"
        ? json.error.message
        : `Failed to remove domain (${res.status})`
    throw new Error(msg)
  }
}

/** Extract commonly useful flags from Vercel domain payload shapes. */
export function inferDomainReady(domainPayload: unknown): {
  verified: boolean
  sslReady: boolean
} {
  const d = domainPayload as Record<string, unknown>
  const verified = Boolean(d?.verified)
  const cert = d?.certificate as Record<string, unknown> | undefined
  const sslReady = Boolean(verified && (cert?.valid === true || d?.cdnEnabled === true || d?.readyState === "READY"))
  return { verified, sslReady: sslReady || verified }
}
