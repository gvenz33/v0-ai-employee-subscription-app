import "server-only"

import { getSupabaseAdmin } from "@/lib/supabase/admin"

export type AuditSource = "dashboard" | "api" | "admin" | "system" | "cron"

export function truncateIp(request?: Request): string | null {
  const raw = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request?.headers?.get("x-real-ip")
    || ""
  if (!raw || raw === "unknown") return null
  const parts = raw.replace(/^::ffff:/, "").split(".")
  if (parts.length >= 4) return `${parts[0]}.${parts[1]}.${parts[2]}.x`
  const ipv6 = raw.includes(":") ? raw.slice(0, Math.min(raw.length, 42)) + "…" : raw
  return ipv6
}

export async function recordAuditLog(params: {
  workspaceOwnerId: string
  actorUserId: string | null
  source: AuditSource
  action: string
  resourceType?: string | null
  resourceId?: string | null
  details?: Record<string, unknown>
  request?: Request
}): Promise<void> {
  try {
    const admin = getSupabaseAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- audit_logs not in generated DB types yet
    await (admin as any).from("audit_logs").insert({
      workspace_owner_id: params.workspaceOwnerId,
      actor_user_id: params.actorUserId,
      source: params.source,
      action: params.action,
      resource_type: params.resourceType ?? null,
      resource_id: params.resourceId ?? null,
      details: params.details ?? {},
      ip_truncated: truncateIp(params.request),
    })
  } catch (e) {
    console.error("[audit-log] recordAuditLog failed:", e)
  }
}
