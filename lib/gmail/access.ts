import "server-only"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEmployeeById, hasAccessToEmployee } from "@/lib/products"

export async function requireEmailAssistantAccess(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const employee = getEmployeeById("email-assistant")
  if (!employee) {
    return { ok: false, response: NextResponse.json({ error: "Email Assistant not found" }, { status: 404 }) }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, disabled_agents")
    .eq("id", user.id)
    .single()

  const { data: alaSubs } = await supabase
    .from("a_la_carte_subscriptions")
    .select("employee_id")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])

  const unlocked = alaSubs?.map((r) => r.employee_id) ?? []
  const tier = profile?.subscription_tier || "personal"

  if (!hasAccessToEmployee(tier, employee, unlocked)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Email Assistant Emma requires Entrepreneur plan or higher." },
        { status: 403 },
      ),
    }
  }

  const disabled: string[] = (profile as { disabled_agents?: string[] } | null)?.disabled_agents ?? []
  if (disabled.includes("email-assistant")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Email Assistant Emma is disabled for your account." }, { status: 403 }),
    }
  }

  return { ok: true, userId: user.id }
}
