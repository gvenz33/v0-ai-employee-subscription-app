import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { recordAuditLog } from "@/lib/audit-log"
import { requireStaffAdmin } from "@/lib/require-staff"

export async function GET(request: NextRequest) {
  const gate = await requireStaffAdmin()
  if (!gate.ok) return gate.response

  const statusFilter = request.nextUrl.searchParams.get("status")

  const admin = getSupabaseAdmin()
  let q = (admin as any).from("ops_incidents").select("*").order("started_at", { ascending: false }).limit(100)

  if (statusFilter && statusFilter !== "all") {
    q = q.eq("status", statusFilter)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ incidents: data || [] })
}

export async function POST(request: NextRequest) {
  const gate = await requireStaffAdmin()
  if (!gate.ok) return gate.response

  const body = await request.json().catch(() => ({}))
  const title = String(body.title || "").trim()
  const description = body.description ? String(body.description).trim() : null
  const severity = ["low", "medium", "high", "critical"].includes(body.severity) ? body.severity : "medium"
  const is_public = Boolean(body.is_public)
  const affected_workspace_owner_id = body.affected_workspace_owner_id || null

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const now = new Date().toISOString()
  const { data: row, error } = await (admin as any)
    .from("ops_incidents")
    .insert({
      title,
      description,
      severity,
      status: "investigating",
      is_public,
      affected_workspace_owner_id,
      created_by: gate.userId,
      updated_at: now,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditLog({
    workspaceOwnerId: gate.userId,
    actorUserId: gate.userId,
    source: "admin",
    action: "ops_incident.create",
    resourceType: "ops_incidents",
    resourceId: row.id,
    details: { title, severity, is_public },
    request,
  })

  return NextResponse.json({ incident: row })
}

export async function PATCH(request: NextRequest) {
  const gate = await requireStaffAdmin()
  if (!gate.ok) return gate.response

  const body = await request.json().catch(() => ({}))
  const id = String(body.id || "").trim()
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof body.title === "string") updates.title = body.title.trim()
  if (typeof body.description === "string") updates.description = body.description.trim()
  if (["low", "medium", "high", "critical"].includes(body.severity)) updates.severity = body.severity
  if (["investigating", "identified", "monitoring", "resolved"].includes(body.status)) {
    updates.status = body.status
    if (body.status === "resolved") {
      updates.resolved_at = new Date().toISOString()
    }
  }
  if (typeof body.is_public === "boolean") updates.is_public = body.is_public

  const admin = getSupabaseAdmin()
  const { data: row, error } = await (admin as any).from("ops_incidents").update(updates).eq("id", id).select("*").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditLog({
    workspaceOwnerId: gate.userId,
    actorUserId: gate.userId,
    source: "admin",
    action: "ops_incident.update",
    resourceType: "ops_incidents",
    resourceId: id,
    details: updates,
    request,
  })

  return NextResponse.json({ incident: row })
}
