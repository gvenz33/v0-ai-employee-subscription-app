import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { vercelConfigured, vercelGetDomainConfig, inferDomainReady } from "@/lib/vercel-domains"
import type { SupabaseClient } from "@supabase/supabase-js"

type AdminContext = { admin: SupabaseClient } | { response: NextResponse }

async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin, is_admin")
    .eq("id", user.id)
    .single()

  if (!profile?.is_superadmin && !profile?.is_admin) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { admin: getSupabaseAdmin() }
}

export async function GET() {
  const ctx = await requireAdmin()
  if ("response" in ctx) return ctx.response
  const { admin } = ctx

  const { data: rows, error: listError } = await admin
    .from("user_custom_domains")
    .select("*")
    .order("updated_at", { ascending: false })

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 })
  }

  const userIds = [...new Set((rows || []).map((r) => r.user_id))]
  const { data: profiles } =
    userIds.length > 0
      ? await admin.from("profiles").select("id, email, full_name").in("id", userIds)
      : { data: [] as { id: string; email: string | null; full_name: string | null }[] }

  const profileById = new Map((profiles || []).map((p) => [p.id, p]))

  const enriched = (rows || []).map((row) => ({
    ...row,
    owner_email: profileById.get(row.user_id)?.email ?? null,
    owner_name: profileById.get(row.user_id)?.full_name ?? null,
  }))

  return NextResponse.json({ domains: enriched, vercelConfigured: vercelConfigured() })
}

/** Toggle activation or trigger a one-off sync from Vercel for a domain row. */
export async function PATCH(request: NextRequest) {
  const ctx = await requireAdmin()
  if ("response" in ctx) return ctx.response
  const { admin } = ctx

  const body = await request.json().catch(() => ({}))
  const id = typeof body.id === "string" ? body.id : ""
  const syncOnly = Boolean(body.sync)

  if (!id) {
    return NextResponse.json({ error: "Missing domain id" }, { status: 400 })
  }

  const { data: row, error: fetchError } = await admin.from("user_custom_domains").select("*").eq("id", id).maybeSingle()

  if (fetchError || !row) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 })
  }

  if (!syncOnly && typeof body.is_active === "boolean") {
    const now = new Date().toISOString()
    let nextStatus = row.status as string
    if (!body.is_active) {
      nextStatus = "disabled"
    } else {
      nextStatus = row.ssl_ready ? "active" : "pending_vercel"
    }
    const { error: updError } = await admin
      .from("user_custom_domains")
      .update({
        is_active: body.is_active,
        updated_at: now,
        status: nextStatus,
      })
      .eq("id", id)

    if (updError) {
      return NextResponse.json({ error: updError.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (!row.hostname || !vercelConfigured()) {
    return NextResponse.json({ skipped: true })
  }

  const payload = await vercelGetDomainConfig(row.hostname)
  const inferred = inferDomainReady(payload)

  let status = row.status as string
  if (inferred.verified && inferred.sslReady) status = "active"
  else if (inferred.verified) status = "verified"
  else status = "pending_vercel"

  const now = new Date().toISOString()
  await admin
    .from("user_custom_domains")
    .update({
      status,
      ssl_ready: inferred.sslReady,
      vercel_meta: {
        ...(typeof row.vercel_meta === "object" && row.vercel_meta ? row.vercel_meta : {}),
        admin_poll: payload,
      },
      last_sync_at: now,
      updated_at: now,
    })
    .eq("id", id)

  return NextResponse.json({ ok: true, status })
}
