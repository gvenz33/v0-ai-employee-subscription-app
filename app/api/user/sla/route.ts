import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { recordAuditLog } from "@/lib/audit-log"

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isEnterpriseTier(tier: string | null | undefined) {
  return tier === "enterprise"
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single()

  if (!isEnterpriseTier(profile?.subscription_tier)) {
    return NextResponse.json({ error: "SLA guarantee is available on Founders tier." }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("sla_tickets")
    .select("id, title, description, severity, status, responded_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: "Failed to load SLA tickets" }, { status: 500 })
  }

  return NextResponse.json({
    targets: {
      uptime_percent: 99.9,
      urgent_first_response_hours: 4,
      standard_first_response_business_hours: 24,
    },
    tickets: data || [],
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single()

  if (!isEnterpriseTier(profile?.subscription_tier)) {
    return NextResponse.json({ error: "SLA guarantee is available on Founders tier." }, { status: 403 })
  }

  const body = await request.json()
  const title = String(body.title || "").trim()
  const description = String(body.description || "").trim()
  const severity = String(body.severity || "standard")

  if (!title || !description) {
    return NextResponse.json({ error: "Title and description are required." }, { status: 400 })
  }

  if (!["standard", "urgent", "critical"].includes(severity)) {
    return NextResponse.json({ error: "Invalid severity." }, { status: 400 })
  }

  const rawIncident = body.incident_id != null ? String(body.incident_id).trim() : ""
  let incidentId: string | null = null
  if (rawIncident) {
    if (!uuidRe.test(rawIncident)) {
      return NextResponse.json({ error: "Invalid incident reference." }, { status: 400 })
    }
    const admin = getSupabaseAdmin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inc } = await (admin as any)
      .from("ops_incidents")
      .select("id")
      .eq("id", rawIncident)
      .maybeSingle()
    if (!inc?.id) {
      return NextResponse.json({ error: "Unknown incident id." }, { status: 400 })
    }
    incidentId = rawIncident
  }

  const insertRow: Record<string, unknown> = {
    user_id: user.id,
    title,
    description,
    severity,
  }
  if (incidentId) insertRow.incident_id = incidentId

  const { data, error } = await supabase
    .from("sla_tickets")
    .insert(insertRow)
    .select("id, title, description, severity, status, responded_at, created_at")
    .single()

  if (error) {
    return NextResponse.json(
      {
        error:
          "Failed to create SLA ticket. Ensure scripts/005_enterprise_white_label_and_sla.sql has been run.",
      },
      { status: 500 }
    )
  }

  await recordAuditLog({
    workspaceOwnerId: user.id,
    actorUserId: user.id,
    source: "dashboard",
    action: "sla_ticket.create",
    resourceType: "sla_tickets",
    resourceId: data.id,
    details: { title, severity, incident_id: incidentId },
    request,
  })

  return NextResponse.json({ ticket: data })
}

