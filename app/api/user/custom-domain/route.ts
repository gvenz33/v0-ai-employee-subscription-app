import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { normalizeHostname, isValidHostname } from "@/lib/custom-domain-utils"
import {
  inferDomainReady,
  vercelAddDomainToProject,
  vercelConfigured,
  vercelGetDomainConfig,
  vercelRemoveDomainFromProject,
} from "@/lib/vercel-domains"

function defaultCnameTarget(): string {
  return (
    process.env.CUSTOM_DOMAIN_CNAME_TARGET?.trim() ||
    process.env.VERCEL_PROJECT_DOMAIN_TARGET?.trim() ||
    "cname.vercel-dns.com"
  )
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

  if (profile?.subscription_tier !== "enterprise") {
    return NextResponse.json({ error: "Custom domains are available on Founders tier." }, { status: 403 })
  }

  const { data: row } = await supabase
    .from("user_custom_domains")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  const meta = (row?.vercel_meta as Record<string, unknown>) || {}
  const verification = meta.verification ?? meta.vercel_payload ?? meta

  return NextResponse.json({
    configured: vercelConfigured(),
    cname_target_hint: defaultCnameTarget(),
    domain: row
      ? {
          hostname: row.hostname,
          status: row.status,
          ssl_ready: row.ssl_ready,
          health_ok: row.health_ok,
          last_health_check_at: row.last_health_check_at,
          last_sync_at: row.last_sync_at,
          last_error: row.last_error,
          is_active: row.is_active,
          verification,
        }
      : null,
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

  if (profile?.subscription_tier !== "enterprise") {
    return NextResponse.json({ error: "Custom domains are available on Founders tier." }, { status: 403 })
  }

  const { data: tenantRow } = await supabase
    .from("tenant_subdomains")
    .select("slug")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!tenantRow?.slug) {
    return NextResponse.json(
      { error: "Save your tenant subdomain first (White Label section), then attach a custom domain." },
      { status: 400 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const hostname = normalizeHostname(String(body.hostname || ""))

  if (!isValidHostname(hostname)) {
    return NextResponse.json({ error: "Enter a valid hostname such as app.yourbrand.com" }, { status: 400 })
  }

  let vercelPayload: unknown = {}
  let initialStatus = "pending_dns"

  if (vercelConfigured()) {
    try {
      vercelPayload = await vercelAddDomainToProject(hostname)
      initialStatus = "pending_vercel"
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to register domain with Vercel"
      return NextResponse.json({ error: msg }, { status: 502 })
    }
  }

  const inferred = inferDomainReady(vercelPayload)
  const nowIso = new Date().toISOString()

  const dbRow = {
    user_id: user.id,
    hostname,
    status: inferred.verified ? (inferred.sslReady ? "active" : "verified") : initialStatus,
    ssl_ready: inferred.sslReady,
    vercel_meta: {
      vercel_payload: vercelPayload,
      cname_target_hint: defaultCnameTarget(),
      verification:
        (vercelPayload as Record<string, unknown>)?.verification ??
        (vercelPayload as Record<string, unknown>)?.verificationResponse ??
        null,
    },
    last_sync_at: nowIso,
    last_error: null,
    is_active: true,
    updated_at: nowIso,
  }

  const { error } = await supabase.from("user_custom_domains").upsert(dbRow, {
    onConflict: "user_id",
  })

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "That hostname is already registered to another account." },
        { status: 409 },
      )
    }
    return NextResponse.json(
      {
        error:
          "Could not save custom domain. Ensure scripts/007_user_custom_domains.sql has been applied.",
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    hostname,
    instructions: {
      point_cname_to: defaultCnameTarget(),
      note:
        "Add a CNAME record from your hostname to the target above (your DNS provider UI). SSL is issued automatically after verification completes.",
    },
  })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: row } = await supabase
    .from("user_custom_domains")
    .select("hostname")
    .eq("user_id", user.id)
    .maybeSingle()

  if (row?.hostname && vercelConfigured()) {
    try {
      await vercelRemoveDomainFromProject(row.hostname)
    } catch {
      /* continue disabling locally even if Vercel removal fails */
    }
  }

  await supabase.from("user_custom_domains").delete().eq("user_id", user.id)

  return NextResponse.json({ ok: true })
}

/** Toggle activation or poll Vercel once for verification / SSL status. */
export async function PATCH(request: Request) {
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

  if (profile?.subscription_tier !== "enterprise") {
    return NextResponse.json({ error: "Custom domains are available on Founders tier." }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))

  if (typeof body.is_active === "boolean") {
    const { data: row } = await supabase
      .from("user_custom_domains")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!row) {
      return NextResponse.json({ error: "No custom domain to update" }, { status: 400 })
    }

    const now = new Date().toISOString()
    let status = row.status as string
    if (!body.is_active) {
      status = "disabled"
    } else {
      status = row.ssl_ready ? "active" : "pending_vercel"
    }

    const { error } = await supabase
      .from("user_custom_domains")
      .update({
        is_active: body.is_active,
        status,
        updated_at: now,
      })
      .eq("user_id", user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, is_active: body.is_active, status })
  }

  const { data: row } = await supabase
    .from("user_custom_domains")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!row?.hostname || !vercelConfigured()) {
    return NextResponse.json({ skipped: true })
  }

  const payload = await vercelGetDomainConfig(row.hostname)
  const inferred = inferDomainReady(payload)

  let status = row.status as string
  if (inferred.verified && inferred.sslReady) status = "active"
  else if (inferred.verified) status = "verified"
  else status = "pending_vercel"

  await supabase
    .from("user_custom_domains")
    .update({
      status,
      ssl_ready: inferred.sslReady,
      vercel_meta: {
        ...(typeof row.vercel_meta === "object" && row.vercel_meta ? row.vercel_meta : {}),
        vercel_poll: payload,
      },
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)

  return NextResponse.json({ ok: true, status })
}
