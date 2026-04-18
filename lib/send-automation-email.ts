import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Transporter } from "nodemailer"
import { Resend } from "resend"
import { getUserAutomationSmtp } from "@/lib/user-automation-email"

function platformFromAddress(): string {
  return (
    process.env.AUTOMATION_EMAIL_FROM?.trim() ||
    "247 AI Employees <hello@247aiemployees.net>"
  )
}

async function sendWithTransport(
  transport: Transporter,
  from: string,
  input: { to: string; subject: string; bodyText: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await transport.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.bodyText,
    })
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "SMTP send failed",
    }
  } finally {
    transport.close()
  }
}

async function sendViaResendPlatform(input: {
  to: string
  subject: string
  bodyText: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    return {
      ok: false,
      error:
        "No automation email configured: add your email in Settings (or set RESEND_API_KEY for platform send).",
    }
  }

  const from = platformFromAddress()
  const resend = new Resend(key)
  const { error } = await resend.emails.send({
    from,
    to: [input.to],
    subject: input.subject,
    text: input.bodyText,
  })

  if (error) {
    return { ok: false, error: typeof error === "string" ? error : error.message || "Email send failed" }
  }
  return { ok: true }
}

/**
 * Sends automation digest: user's SMTP from Settings if configured, else platform Resend.
 */
export async function sendAutomationDigestEmail(input: {
  userId: string
  supabase: SupabaseClient
  to: string
  subject: string
  bodyText: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const userMail = await getUserAutomationSmtp(input.supabase, input.userId)
  if (userMail) {
    const r = await sendWithTransport(userMail.transport, userMail.from, {
      to: input.to,
      subject: input.subject,
      bodyText: input.bodyText,
    })
    if (r.ok) return r
    const fallback = await sendViaResendPlatform(input)
    if (fallback.ok) return fallback
    return {
      ok: false,
      error: `Your SMTP: ${r.error}. Platform fallback: ${fallback.error}`,
    }
  }

  return sendViaResendPlatform(input)
}
