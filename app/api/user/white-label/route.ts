import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getRootDomain, normalizeTenantSlug } from "@/lib/tenancy"

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
    return NextResponse.json({ error: "White label is available on Founders tier." }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("user_white_label_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: "Failed to load white-label settings" }, { status: 500 })
  }

  const { data: tenantData } = await supabase
    .from("tenant_subdomains")
    .select("slug, host, is_active")
    .eq("user_id", user.id)
    .maybeSingle()

  return NextResponse.json({
    settings: data || {
      enabled: false,
      brand_name: "",
      logo_url: "",
      support_email: "",
      primary_color: "",
      remove_247_branding: false,
    },
    tenant: tenantData
      ? {
          slug: tenantData.slug,
          host: tenantData.host,
          is_active: tenantData.is_active,
          url: `https://${tenantData.host}`,
        }
      : null,
  })
}

export async function PUT(request: Request) {
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
    return NextResponse.json({ error: "White label is available on Founders tier." }, { status: 403 })
  }

  const body = await request.json()
  const requestedSlug = body.tenant_slug ? normalizeTenantSlug(String(body.tenant_slug)) : ""
  if (requestedSlug && (requestedSlug.length < 3 || requestedSlug.length > 63)) {
    return NextResponse.json(
      { error: "Tenant slug must be between 3 and 63 characters." },
      { status: 400 }
    )
  }

  const row = {
    user_id: user.id,
    enabled: Boolean(body.enabled),
    brand_name: body.brand_name?.trim() || null,
    logo_url: body.logo_url?.trim() || null,
    support_email: body.support_email?.trim() || null,
    primary_color: body.primary_color?.trim() || null,
    remove_247_branding: Boolean(body.remove_247_branding),
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from("user_white_label_settings")
    .upsert(row, { onConflict: "user_id" })

  if (error) {
    return NextResponse.json(
      {
        error:
          "Failed to save white-label settings. Ensure scripts/005_enterprise_white_label_and_sla.sql has been run.",
      },
      { status: 500 }
    )
  }

  if (requestedSlug) {
    const host = `${requestedSlug}.${getRootDomain()}`
    const { error: tenantError } = await supabase
      .from("tenant_subdomains")
      .upsert(
        {
          user_id: user.id,
          slug: requestedSlug,
          host,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )

    if (tenantError) {
      if (tenantError.code === "23505") {
        return NextResponse.json(
          { error: "That tenant slug is already in use. Please choose another." },
          { status: 409 }
        )
      }
      return NextResponse.json(
        {
          error:
            "Failed to save tenant subdomain. Ensure scripts/006_tenant_routing_subdomains.sql has been run.",
        },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ ok: true, tenant_host: requestedSlug ? `${requestedSlug}.${getRootDomain()}` : null })
}

