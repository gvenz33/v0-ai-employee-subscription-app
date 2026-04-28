import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/** Public status: active incidents the team chooses to disclose. */
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("ops_incidents")
    .select("id, title, severity, status, started_at, resolved_at, description")
    .eq("is_public", true)
    .order("started_at", { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ incidents: [], error: error.message }, { status: 200 })
  }

  return NextResponse.json({ incidents: data || [] })
}
