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

  return NextResponse.json({
    settings: data || {
      enabled: false,
      brand_name: "",
      logo_url: "",
      support_email: "",
      primary_color: "",
      remove_247_branding: false,
    },
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

  return NextResponse.json({ ok: true })
}

