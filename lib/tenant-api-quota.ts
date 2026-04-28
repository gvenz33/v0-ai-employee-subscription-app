import "server-only"

import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { hasForbiddenImpersonationHeaders } from "@/lib/impersonation-guard"

const HOUR_MS = 60 * 60 * 1000

export function hourlyApiCapForTier(tier: string | null | undefined): number {
  switch (tier) {
    case "enterprise":
      return 600
    case "business":
      return 300
    case "entrepreneur":
      return 120
    default:
      return 60
  }
}

export type GuardResult =
  | { ok: true; tier: string | null }
  | { ok: false; status: number; message: string }

export async function guardTenantApiAccess(
  userId: string,
  request: Request
): Promise<GuardResult> {
  if (hasForbiddenImpersonationHeaders(request)) {
    return { ok: false, status: 403, message: "Forbidden" }
  }

  const admin = getSupabaseAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile, error } = await (admin as any)
    .from("profiles")
    .select("subscription_tier, api_access_suspended")
    .eq("id", userId)
    .maybeSingle()

  if (error || !profile) {
    return { ok: false, status: 403, message: "Access denied" }
  }
  if (profile.api_access_suspended) {
    return {
      ok: false,
      status: 403,
      message: "API access is suspended for this account. Contact support.",
    }
  }

  const tier = profile.subscription_tier as string | null
  const cap = hourlyApiCapForTier(tier)
  const since = new Date(Date.now() - HOUR_MS).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error: cntError } = await (admin as any)
    .from("api_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since)

  if (cntError) {
    return { ok: true, tier }
  }

  if ((count ?? 0) >= cap) {
    return {
      ok: false,
      status: 429,
      message: `API rate limit reached for this hour (${cap} requests). Try again later or upgrade your plan.`,
    }
  }

  return { ok: true, tier }
}
