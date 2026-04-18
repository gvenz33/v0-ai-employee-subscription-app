import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { generateText } from "ai"
import { AI_EMPLOYEES } from "@/lib/products"
import { computeNextRunAt } from "@/lib/compute-next-automation-run"
import { sendAutomationDigestEmail } from "@/lib/send-automation-email"

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
}

const tierOrder: Record<string, number> = {
  free: 0,
  personal: 1,
  entrepreneur: 2,
  business: 3,
  enterprise: 4,
}

export async function runDueScheduledAutomations(
  supabase: SupabaseClient,
  options: { limit?: number } = {}
): Promise<{ processed: number; failed: number; skipped: number }> {
  const limit = options.limit ?? 10
  const now = new Date().toISOString()

  const { data: rows, error } = await supabase
    .from("scheduled_automations")
    .select("*")
    .eq("is_active", true)
    .lte("next_run_at", now)
    .order("next_run_at", { ascending: true })
    .limit(limit)

  if (error || !rows?.length) {
    return { processed: 0, failed: 0, skipped: 0 }
  }

  let processed = 0
  let failed = 0
  let skipped = 0

  for (const row of rows as AutomationRow[]) {
    const employee = AI_EMPLOYEES.find((e) => e.id === row.ai_employee_id)
    if (!employee) {
      await supabase
        .from("scheduled_automations")
        .update({
          last_error: "Unknown AI employee",
          last_run_at: new Date().toISOString(),
          next_run_at: computeNextRunAt({
            frequency: row.frequency,
            timezone: row.timezone,
            timeLocal: row.time_local,
            weekday: row.weekday,
            strictlyAfter: new Date(),
          }).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
      failed++
      continue
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, tasks_used, tasks_limit")
      .eq("id", row.user_id)
      .single()

    if (!profile) {
      skipped++
      continue
    }

    const userTierLevel = tierOrder[profile.subscription_tier as keyof typeof tierOrder] ?? 0
    const requiredTierLevel = tierOrder[employee.tier_required as keyof typeof tierOrder] ?? 0
    if (userTierLevel < requiredTierLevel) {
      await supabase
        .from("scheduled_automations")
        .update({
          last_error: `Plan does not include ${employee.tier_required} tier employees`,
          last_run_at: new Date().toISOString(),
          next_run_at: computeNextRunAt({
            frequency: row.frequency,
            timezone: row.timezone,
            timeLocal: row.time_local,
            weekday: row.weekday,
            strictlyAfter: new Date(),
          }).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
      skipped++
      continue
    }

    if (profile.tasks_used >= profile.tasks_limit) {
      await supabase
        .from("scheduled_automations")
        .update({
          last_error: "Task limit reached; upgrade or add credits to resume deliveries",
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
      skipped++
      continue
    }

    try {
      const { text, usage } = await generateText({
        model: "openai/gpt-4o-mini",
        system: employee.systemPrompt,
        prompt: row.prompt,
      })

      const subject = `[247 AI Employees] ${row.title || employee.name}`
      const bodyText = `${row.title || employee.name} (${employee.role})\n\n${text}`

      const emailResult = await sendAutomationDigestEmail({
        to: row.delivery_email,
        subject,
        bodyText,
      })

      if (!emailResult.ok) {
        const nextAfterEmailFail = computeNextRunAt({
          frequency: row.frequency,
          timezone: row.timezone,
          timeLocal: row.time_local,
          weekday: row.weekday,
          strictlyAfter: new Date(),
        })
        await supabase
          .from("scheduled_automations")
          .update({
            last_error: emailResult.error,
            next_run_at: nextAfterEmailFail.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id)
        failed++
        continue
      }

      const nextRun = computeNextRunAt({
        frequency: row.frequency,
        timezone: row.timezone,
        timeLocal: row.time_local,
        weekday: row.weekday,
        strictlyAfter: new Date(),
      })

      await supabase
        .from("scheduled_automations")
        .update({
          last_run_at: new Date().toISOString(),
          last_error: null,
          next_run_at: nextRun.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)

      await supabase.rpc("increment_tasks_used", { p_user_id: row.user_id })

      await supabase.from("task_logs").insert({
        user_id: row.user_id,
        task_type: row.ai_employee_id,
        description: `Scheduled: ${row.title || employee.name}`,
        status: "completed",
        tokens_used: usage?.totalTokens ?? 0,
      })

      processed++
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error"
      try {
        const bump = computeNextRunAt({
          frequency: row.frequency,
          timezone: row.timezone,
          timeLocal: row.time_local,
          weekday: row.weekday,
          strictlyAfter: new Date(),
        })
        await supabase
          .from("scheduled_automations")
          .update({
            last_error: msg,
            next_run_at: bump.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id)
      } catch {
        await supabase
          .from("scheduled_automations")
          .update({
            last_error: msg,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id)
      }
      failed++
    }
  }

  return { processed, failed, skipped }
}
