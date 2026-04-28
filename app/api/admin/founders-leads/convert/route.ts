import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

async function requireSuperAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single()
  if (!profile?.is_superadmin) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { ok: true as const, userId: user.id }
}

export async function POST(request: NextRequest) {
  const gate = await requireSuperAdmin()
  if (!gate.ok) return gate.response

  const body = await request.json().catch(() => ({}))
  const leadId = String(body.lead_id || "").trim()
  const password = String(body.password || "").trim()
  const fullNameOverride = body.full_name ? String(body.full_name).trim() : ""

  if (!leadId || password.length < 8) {
    return NextResponse.json({ error: "lead_id and password (min 8 chars) are required" }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
  const { data: lead, error: leadErr } = await (admin as any).from("founders_leads").select("*").eq("id", leadId).single()
  if (leadErr || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }
  if (lead.converted_user_id) {
    return NextResponse.json({ error: "Lead already converted" }, { status: 409 })
  }

  const email = String(lead.email || "").trim().toLowerCase()
  if (!email) return NextResponse.json({ error: "Lead email missing" }, { status: 400 })

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle()
  if (existingProfile?.id) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 })
  }

  const fullName = fullNameOverride || String(lead.name || "").trim() || "Founders Customer"

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message || "Failed to create user" }, { status: 500 })
  }

  const monthlyCents = typeof lead.monthly_quote_cents === "number" ? lead.monthly_quote_cents : null
  const yearlyCents = typeof lead.yearly_quote_cents === "number" ? lead.yearly_quote_cents : null

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    email,
    full_name: fullName,
    subscription_tier: "enterprise",
    tasks_limit: 999999,
    enterprise_custom_monthly_cents: monthlyCents,
    enterprise_custom_yearly_cents: yearlyCents,
  })
  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  await admin.from("affiliates").insert({
    user_id: created.user.id,
    referral_code: `REF${created.user.id.slice(0, 8).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    commission_rate: 20,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
  await (admin as any)
    .from("founders_leads")
    .update({
      status: "closed_won",
      converted_user_id: created.user.id,
      converted_at: new Date().toISOString(),
      assigned_to: gate.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)

  return NextResponse.json({ ok: true, user_id: created.user.id, email })
}
