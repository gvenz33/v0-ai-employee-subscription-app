import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { AI_EMPLOYEES } from "@/lib/products"
import { computeNextRunAt, parseTimeLocalHHMM } from "@/lib/compute-next-automation-run"
import { scheduledAutomationBodySchema, tierOrder } from "@/lib/scheduled-automation-schema"

type AutomationRow = {
  id: string
  user_id: string
  ai_employee_id: string
  title: string | null
  prompt: string
  timezone: string
  time_local: string
  frequency: "daily" | "weekly"
  weekday: number | null
  delivery_email: string
  is_active: boolean
  next_run_at: string
}

const patchFieldsSchema = z
  .object({
    is_active: z.boolean().optional(),
    ai_employee_id: z.string().min(1).optional(),
    title: z.string().max(200).optional().nullable(),
    prompt: z.string().min(10).max(12000).optional(),
    timezone: z.string().min(1).max(80).optional(),
    time_local: z.string().min(4).max(8).optional(),
    frequency: z.enum(["daily", "weekly"]).optional(),
    weekday: z.number().int().min(0).max(6).optional().nullable(),
    delivery_email: z.string().email().max(320).optional(),
  })
  .strict()

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const raw = await request.json().catch(() => ({}))
  const parsed = patchFieldsSchema.safeParse(raw)
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }
  const patch = parsed.data
  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 })
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("scheduled_automations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (fetchErr || !existing) {
    return Response.json({ error: "Automation not found" }, { status: 404 })
  }

  const ex = existing as AutomationRow

  if (Object.keys(patch).length === 1 && patch.is_active !== undefined) {
    const { data, error } = await supabase
      .from("scheduled_automations")
      .update({
        is_active: patch.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error || !data) {
      return Response.json({ error: "Update failed" }, { status: 500 })
    }
    return Response.json({ automation: data })
  }

  const frequency = patch.frequency ?? ex.frequency
  const weekdayResolved =
    frequency === "weekly"
      ? patch.weekday !== undefined && patch.weekday !== null
        ? patch.weekday
        : ex.weekday
      : null

  const mergedForZod = {
    ai_employee_id: patch.ai_employee_id ?? ex.ai_employee_id,
    title:
      patch.title !== undefined
        ? patch.title === null || patch.title === ""
          ? undefined
          : patch.title
        : ex.title ?? undefined,
    prompt: patch.prompt ?? ex.prompt,
    timezone: patch.timezone ?? ex.timezone,
    time_local: patch.time_local ?? ex.time_local,
    frequency,
    weekday: frequency === "daily" ? null : weekdayResolved,
    delivery_email: patch.delivery_email ?? ex.delivery_email,
  }

  const bodyCheck = scheduledAutomationBodySchema.safeParse(mergedForZod)
  if (!bodyCheck.success) {
    const msg =
      bodyCheck.error.flatten().fieldErrors.weekday?.[0] ||
      bodyCheck.error.errors[0]?.message ||
      "Invalid automation fields"
    return Response.json({ error: msg }, { status: 400 })
  }

  const body = bodyCheck.data

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

  const scheduleChanged =
    patch.time_local !== undefined ||
    patch.timezone !== undefined ||
    patch.frequency !== undefined ||
    patch.weekday !== undefined

  let next_run_at = ex.next_run_at
  if (scheduleChanged) {
    try {
      next_run_at = computeNextRunAt({
        frequency: body.frequency,
        timezone: body.timezone,
        timeLocal: body.time_local,
        weekday: body.frequency === "weekly" ? body.weekday ?? null : null,
        strictlyAfter: new Date(),
      }).toISOString()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid schedule"
      return Response.json({ error: msg }, { status: 400 })
    }
  }

  const updatePayload: Record<string, unknown> = {
    ai_employee_id: body.ai_employee_id,
    title: body.title?.trim() || null,
    prompt: body.prompt.trim(),
    timezone: body.timezone,
    time_local: body.time_local,
    frequency: body.frequency,
    weekday: body.frequency === "weekly" ? body.weekday! : null,
    delivery_email: body.delivery_email.trim().toLowerCase(),
    next_run_at,
    updated_at: new Date().toISOString(),
  }

  if (patch.is_active !== undefined) {
    updatePayload.is_active = patch.is_active
  }

  const { data, error } = await supabase
    .from("scheduled_automations")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error || !data) {
    return Response.json({ error: "Failed to update automation" }, { status: 500 })
  }

  return Response.json({ automation: data })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { error } = await supabase
    .from("scheduled_automations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return Response.json({ error: "Failed to delete" }, { status: 500 })
  }

  return Response.json({ ok: true })
}
