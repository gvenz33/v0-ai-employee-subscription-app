import "server-only"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function requireStaffAdmin(): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin, is_admin")
    .eq("id", user.id)
    .single()

  if (!profile?.is_superadmin && !profile?.is_admin) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { ok: true, userId: user.id }
}
