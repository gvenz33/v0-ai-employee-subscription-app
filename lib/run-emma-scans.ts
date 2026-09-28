import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { getValidGmailAccessToken, listGmailConnections } from "@/lib/gmail/client"
import {
  formatTriageSummaryEmail,
  runInboxTriageForMailbox,
} from "@/lib/gmail/run-inbox-triage"
import {
  computeNextEmmaScanAt,
  type EmmaScanFrequency,
} from "@/lib/gmail/schedule"
import { sendAutomationDigestEmail } from "@/lib/send-automation-email"
import { guardTenantApiAccess } from "@/lib/tenant-api-quota"

type ScheduleRow = {
  user_id: string
  is_active: boolean
  timezone: string
  frequency: EmmaScanFrequency
  time_local: string
  delivery_email: string
  auto_create_drafts: boolean
}

export async function runDueEmmaScans(
  supabase: SupabaseClient,
  options: { limit?: number; abuseRequest?: Request } = {},
): Promise<{ processed: number; failed: number; skipped: number }> {
  const limit = options.limit ?? 5
  const now = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any)
    .from("emma_scan_schedules")
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

  for (const row of rows as ScheduleRow[]) {
    const bumpNext = () =>
      computeNextEmmaScanAt({
        frequency: row.frequency,
        timezone: row.timezone,
        timeLocal: row.time_local,
        strictlyAfter: new Date(),
      }).toISOString()

    try {
      if (options.abuseRequest) {
        const guard = await guardTenantApiAccess(row.user_id, options.abuseRequest)
        if (!guard.ok) {
          await supabase
            .from("emma_scan_schedules")
            .update({
              next_run_at: bumpNext(),
              last_error: guard.message || "Quota / access blocked",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", row.user_id)
          skipped++
          continue
        }
      }

      const connections = await listGmailConnections(row.user_id)
      if (!connections.length) {
        await supabase
          .from("emma_scan_schedules")
          .update({
            is_active: false,
            last_error: "No Gmail accounts connected — schedule paused",
            next_run_at: bumpNext(),
            last_run_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", row.user_id)
        skipped++
        continue
      }

      const results = []
      for (const conn of connections) {
        try {
          const { accessToken, email } = await getValidGmailAccessToken(row.user_id, conn.id)
          const result = await runInboxTriageForMailbox({
            accessToken,
            email,
            autoCreateDrafts: row.auto_create_drafts,
          })
          results.push(result)
        } catch (e) {
          results.push({
            mailbox: conn.email,
            scanned: 0,
            unread: 0,
            activeThreadsFound: 0,
            activeThreadsConsidered: 0,
            seenMessages: [],
            draftsCreated: [],
            draftFailures: [
              {
                threadId: conn.id,
                error: e instanceof Error ? e.message : "Scan failed",
              },
            ],
            replySkipped: [],
            cleanupSuggestions: [],
          })
        }
      }

      const { subject, bodyText } = formatTriageSummaryEmail(results)
      const emailResult = await sendAutomationDigestEmail({
        userId: row.user_id,
        supabase,
        to: row.delivery_email,
        subject,
        bodyText,
      })

      await supabase
        .from("emma_scan_schedules")
        .update({
          last_run_at: new Date().toISOString(),
          next_run_at: bumpNext(),
          last_error: emailResult.ok ? null : emailResult.error,
          last_summary: bodyText.slice(0, 4000),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", row.user_id)

      if (emailResult.ok) processed++
      else failed++
    } catch (e) {
      await supabase
        .from("emma_scan_schedules")
        .update({
          last_run_at: new Date().toISOString(),
          next_run_at: bumpNext(),
          last_error: e instanceof Error ? e.message : "Emma scan failed",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", row.user_id)
      failed++
    }
  }

  return { processed, failed, skipped }
}
