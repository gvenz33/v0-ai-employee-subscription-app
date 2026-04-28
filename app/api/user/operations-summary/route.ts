import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { hourlyApiCapForTier } from "@/lib/tenant-api-quota"

function isEnterpriseTier(tier: string | null | undefined) {
  return tier === "enterprise"
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, api_access_suspended, tasks_used, tasks_limit")
    .eq("id", user.id)
    .single()

  if (!isEnterpriseTier(profile?.subscription_tier)) {
    return NextResponse.json({ error: "Operations center is available on Founders tier." }, { status: 403 })
  }

  const admin = getSupabaseAdmin()
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const [auditCount, apiCount, pendingTasks, openSla] = await Promise.all([
    (admin as any)
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("workspace_owner_id", user.id)
      .gte("created_at", dayAgo),
    (admin as any)
      .from("api_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", dayAgo),
    (admin as any)
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending"),
    supabase
      .from("sla_tickets")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["open", "acknowledged"]),
  ])

  const { data: publicIncidents } = await supabase
    .from("ops_incidents")
    .select("id, title, severity, status, started_at, resolved_at")
    .eq("is_public", true)
    .neq("status", "resolved")
    .order("started_at", { ascending: false })
    .limit(5)

  const tier = profile?.subscription_tier as string | null
  const hourlyCap = hourlyApiCapForTier(tier)

  const { count: apiHour } = await (admin as any)
    .from("api_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", hourAgo)

  return NextResponse.json({
    profile: {
      api_access_suspended: Boolean(profile?.api_access_suspended),
      tasks_used: profile?.tasks_used ?? 0,
      tasks_limit: profile?.tasks_limit ?? 0,
    },
    counts: {
      audit_events_24h: auditCount.count ?? 0,
      api_calls_24h: apiCount.count ?? 0,
      api_calls_rolling_1h: apiHour?.count ?? 0,
      api_hourly_cap: hourlyCap,
      pending_tasks: pendingTasks.count ?? 0,
      open_sla_tickets: openSla.count ?? 0,
    },
    public_incidents: publicIncidents || [],
  })
}
