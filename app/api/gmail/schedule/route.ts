import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireEmailAssistantAccess } from "@/lib/gmail/access"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import {
  assertEmmaScheduleInput,
  computeNextEmmaScanAt,
  type EmmaScanFrequency,
} from "@/lib/gmail/schedule"
import { listGmailConnections } from "@/lib/gmail/client"

const putSchema = z.object({
  isActive: z.boolean(),
  frequency: z.enum(["hourly", "every_2_hours", "every_4_hours", "daily"]),
  timeLocal: z.string().regex(/^\d{1,2}:\d{2}$/),
  timezone: z.string().min(1).max(80),
  deliveryEmail: z.string().email().max(320),
  autoCreateDrafts: z.boolean().optional(),
})

export async function GET() {
  const gate = await requireEmailAssistantAccess()
  if (!gate.ok) return gate.response

  const admin = getSupabaseAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("emma_scan_schedules")
    .select("*")
    .eq("user_id", gate.userId)
    .maybeSingle()

  const accounts = await listGmailConnections(gate.userId)

  return NextResponse.json({
    schedule: data
      ? {
          isActive: data.is_active,
          frequency: data.frequency,
          timeLocal: data.time_local,
          timezone: data.timezone,
          deliveryEmail: data.delivery_email,
          autoCreateDrafts: data.auto_create_drafts,
          nextRunAt: data.next_run_at,
          lastRunAt: data.last_run_at,
          lastError: data.last_error,
          lastSummary: data.last_summary,
        }
      : null,
    connectedAccounts: accounts.length,
  })
}

export async function PUT(request: NextRequest) {
  const gate = await requireEmailAssistantAccess()
  if (!gate.ok) return gate.response

  const json = await request.json().catch(() => null)
  const parsed = putSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Provide isActive, frequency (hourly|every_2_hours|every_4_hours|daily), timeLocal (HH:MM), timezone, deliveryEmail",
      },
      { status: 400 },
    )
  }

  try {
    assertEmmaScheduleInput({
      frequency: parsed.data.frequency,
      timeLocal: parsed.data.timeLocal,
      timezone: parsed.data.timezone,
      deliveryEmail: parsed.data.deliveryEmail,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid schedule" },
      { status: 400 },
    )
  }

  const accounts = await listGmailConnections(gate.userId)
  if (parsed.data.isActive && !accounts.length) {
    return NextResponse.json(
      { error: "Connect at least one Gmail account before enabling scheduled scans." },
      { status: 400 },
    )
  }

  const frequency = parsed.data.frequency as EmmaScanFrequency
  const nextRunAt = computeNextEmmaScanAt({
    frequency,
    timezone: parsed.data.timezone,
    timeLocal: parsed.data.timeLocal,
    strictlyAfter: new Date(),
  }).toISOString()

  const admin = getSupabaseAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("emma_scan_schedules")
    .upsert(
      {
        user_id: gate.userId,
        is_active: parsed.data.isActive,
        frequency,
        time_local: parsed.data.timeLocal,
        timezone: parsed.data.timezone,
        delivery_email: parsed.data.deliveryEmail,
        auto_create_drafts: parsed.data.autoCreateDrafts ?? true,
        next_run_at: nextRunAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    schedule: {
      isActive: data.is_active,
      frequency: data.frequency,
      timeLocal: data.time_local,
      timezone: data.timezone,
      deliveryEmail: data.delivery_email,
      autoCreateDrafts: data.auto_create_drafts,
      nextRunAt: data.next_run_at,
      lastRunAt: data.last_run_at,
      lastError: data.last_error,
      lastSummary: data.last_summary,
    },
  })
}
