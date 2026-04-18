import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { AI_EMPLOYEES } from "@/lib/products"
import { computeNextRunAt, parseTimeLocalHHMM } from "@/lib/compute-next-automation-run"
import { scheduledAutomationBodySchema, tierOrder } from "@/lib/scheduled-automation-schema"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("scheduled_automations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("scheduled_automations GET", error)
    return Response.json({ error: "Failed to load automations" }, { status: 500 })
  }

  return Response.json({ automations: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = scheduledAutomationBodySchema.safeParse(await request.json())
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.weekday?.[0] || "Invalid request body"
    return Response.json({ error: msg }, { status: 400 })
  }
  const body = parsed.data

  if (!parseTimeLocalHHMM(body.time_local)) {
    return Response.json({ error: "time_local must be HH:MM (24h)" }, { status: 400 })
  }

  const employee = AI_EMPLOYEES.find((e) => e.id === body.ai_employee_id)
  if (!employee) {
    return Response.json({ error: "Invalid ai_employee_id" }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single()

  if (!profile) return Response.json({ error: "Profile not found" }, { status: 404 })

  const userTierLevel = tierOrder[profile.subscription_tier as keyof typeof tierOrder] ?? 0
  const requiredTierLevel = tierOrder[employee.tier_required as keyof typeof tierOrder] ?? 0
  if (userTierLevel < requiredTierLevel) {
    return Response.json(
      { error: `Upgrade to ${employee.tier_required} to use this AI employee` },
      { status: 403 }
    )
  }

  let next_run_at: Date
  try {
    next_run_at = computeNextRunAt({
      frequency: body.frequency,
      timezone: body.timezone,
      timeLocal: body.time_local,
      weekday: body.frequency === "weekly" ? body.weekday ?? null : null,
      strictlyAfter: new Date(),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid schedule"
    return Response.json({ error: msg }, { status: 400 })
  }

  const { data: row, error } = await supabase
    .from("scheduled_automations")
    .insert({
      user_id: user.id,
      ai_employee_id: body.ai_employee_id,
      title: body.title?.trim() || null,
      prompt: body.prompt.trim(),
      timezone: body.timezone,
      time_local: body.time_local,
      frequency: body.frequency,
      weekday: body.frequency === "weekly" ? body.weekday! : null,
      delivery_email: body.delivery_email.trim().toLowerCase(),
      is_active: true,
      next_run_at: next_run_at.toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("scheduled_automations INSERT", error)
    return Response.json(
      {
        error:
          "Could not save automation. If this is the first time, run the SQL in scripts/002_scheduled_automations.sql in Supabase.",
      },
      { status: 500 }
    )
  }

  return Response.json({ automation: row }, { status: 201 })
}
