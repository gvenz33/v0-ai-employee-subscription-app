import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { recordAuditLog } from "@/lib/audit-log"
import { requireStaffAdmin } from "@/lib/require-staff"
import { hourlyApiCapForTier } from "@/lib/tenant-api-quota"

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  const gate = await requireStaffAdmin()
  if (!gate.ok) return gate.response

  const q = request.nextUrl.searchParams.get("q")?.trim() || ""
  if (q.length < 2) {
    return NextResponse.json({ error: "Query (q) must be at least 2 characters" }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  let userId: string | null = null
  if (uuidRe.test(q)) {
    userId = q
  } else {
    const { data: profs } = await (admin as any)
      .from("profiles")
      .select("id, email, full_name, subscription_tier, api_access_suspended, tasks_used, tasks_limit, created_at")
      .ilike("email", `%${q.replace(/%/g, "")}%`)
      .limit(5)

    if (!profs?.length) {
      return NextResponse.json({ results: [] })
    }
    if (profs.length === 1) {
      userId = profs[0].id
    } else {
      return NextResponse.json({ results: profs, ambiguous: true })
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const { data: profile } = await (admin as any)
    .from("profiles")
    .select("id, email, full_name, subscription_tier, api_access_suspended, tasks_used, tasks_limit, created_at")
    .eq("id", userId)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const [slaOpen, auditRecent, apiDay, apiHour, domains] = await Promise.all([
    (admin as any)
      .from("sla_tickets")
      .select("id, title, severity, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    (admin as any)
      .from("audit_logs")
      .select("id, source, action, created_at")
      .eq("workspace_owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(15),
    (admin as any)
      .from("api_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", dayAgo),
    (admin as any)
      .from("api_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", hourAgo),
    (admin as any).from("user_custom_domains").select("hostname, status, ssl_ready, last_health_check_at").eq("user_id", userId).maybeSingle(),
  ])

  await recordAuditLog({
    workspaceOwnerId: gate.userId,
    actorUserId: gate.userId,
    source: "admin",
    action: "support.tenant_lookup",
    resourceType: "profiles",
    resourceId: userId,
    details: { query: q },
    request,
  })

  return NextResponse.json({
    profile,
    hourly_api_cap: hourlyApiCapForTier(profile.subscription_tier),
    counts: {
      api_calls_24h: apiDay.count ?? 0,
      api_calls_1h: apiHour.count ?? 0,
    },
    sla_tickets: slaOpen.data || [],
    audit_recent: auditRecent.data || [],
    custom_domain: domains.data ?? null,
  })
}
