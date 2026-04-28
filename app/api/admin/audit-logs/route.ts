import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { requireStaffAdmin } from "@/lib/require-staff"

export async function GET(request: NextRequest) {
  const gate = await requireStaffAdmin()
  if (!gate.ok) return gate.response

  const url = request.nextUrl.searchParams
  const workspaceOwnerId = url.get("workspace_owner_id")?.trim()
  const limit = Math.min(parseInt(url.get("limit") || "80", 10), 250)

  const admin = getSupabaseAdmin()
  let q = (admin as any)
    .from("audit_logs")
    .select("id, workspace_owner_id, actor_user_id, source, action, resource_type, resource_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (workspaceOwnerId) {
    q = q.eq("workspace_owner_id", workspaceOwnerId)
  }

  const { data, error } = await q

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ logs: data || [] })
}
