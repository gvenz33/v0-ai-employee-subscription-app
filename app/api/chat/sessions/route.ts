import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const employeeId = request.nextUrl.searchParams.get("employeeId")
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId is required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("employee_chat_sessions")
    .select("id, employee_id, title, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("employee_id", employeeId)
    .order("updated_at", { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sessions: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const employeeId = typeof body.employeeId === "string" ? body.employeeId : null
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId is required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("employee_chat_sessions")
    .insert({ user_id: user.id, employee_id: employeeId, title: null })
    .select("id, employee_id, title, created_at, updated_at")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ session: data })
}
