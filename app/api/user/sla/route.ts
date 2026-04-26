import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

  const { data, error } = await supabase
    .from("sla_tickets")
    .insert({
      user_id: user.id,
      title,
      description,
      severity,
    })
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

  return NextResponse.json({ ticket: data })
}

