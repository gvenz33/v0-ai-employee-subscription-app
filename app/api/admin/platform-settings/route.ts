import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { getPlatformSettings } from "@/lib/platform-settings-server"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function settingsTable() {
  return (getSupabaseAdmin() as any).from("platform_settings")
}

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response

  const settings = await getPlatformSettings()
  return NextResponse.json({ settings })
}

export async function PATCH(request: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response

  const body = await request.json().catch(() => ({}))
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof body.support_chat_enabled !== "boolean") {
    return NextResponse.json({ error: "support_chat_enabled (boolean) is required" }, { status: 400 })
  }
  updates.support_chat_enabled = body.support_chat_enabled

  const { data, error } = await settingsTable()
    .upsert({ id: 1, ...updates }, { onConflict: "id" })
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ settings: data })
}
