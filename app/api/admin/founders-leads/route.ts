import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, is_superadmin")
    .eq("id", user.id)
    .single()

  if (!profile?.is_admin && !profile?.is_superadmin) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { ok: true as const, userId: user.id, isSuperAdmin: Boolean(profile.is_superadmin) }
}

export async function GET(request: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response

  const status = request.nextUrl.searchParams.get("status")
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || "120"), 300)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
  let q = (getSupabaseAdmin() as any).from("founders_leads").select("*").order("created_at", { ascending: false }).limit(limit)
  if (status && status !== "all") q = q.eq("status", status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ leads: data || [] })
}

export async function PATCH(request: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response

  const body = await request.json().catch(() => ({}))
  const id = String(body.id || "").trim()
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (typeof body.status === "string") {
    const allowed = ["new", "contacted", "qualified", "closed_won", "closed_lost"]
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }
    updates.status = body.status
  }
  if (typeof body.internal_notes === "string") updates.internal_notes = body.internal_notes.trim()
  if (typeof body.monthly_quote_cents === "number" || body.monthly_quote_cents === null) {
    updates.monthly_quote_cents = body.monthly_quote_cents
  }
  if (typeof body.yearly_quote_cents === "number" || body.yearly_quote_cents === null) {
    updates.yearly_quote_cents = body.yearly_quote_cents
  }
  updates.assigned_to = gate.userId

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types
  const { data, error } = await (getSupabaseAdmin() as any)
    .from("founders_leads")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lead: data })
}
