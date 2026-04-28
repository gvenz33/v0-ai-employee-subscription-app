import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function isEnterpriseTier(tier: string | null | undefined) {
  return tier === "enterprise"
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single()

  if (!isEnterpriseTier(profile?.subscription_tier)) {
    return NextResponse.json({ error: "Audit logs are available on Founders tier." }, { status: 403 })
  }

  const url = new URL(request.url)
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200)

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_user_id, source, action, resource_type, resource_id, details, ip_truncated, created_at")
    .eq("workspace_owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json(
      { error: "Failed to load audit logs. Ensure scripts/009_ops_security_sla.sql has been applied." },
      { status: 500 },
    )
  }

  return NextResponse.json({ logs: data || [] })
}
