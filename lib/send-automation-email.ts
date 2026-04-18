import "server-only"

import { Resend } from "resend"

export async function sendAutomationDigestEmail(input: {
  to: string
  subject: string
  bodyText: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    return { ok: false, error: "RESEND_API_KEY is not configured" }
  }

  const from =
    process.env.AUTOMATION_EMAIL_FROM?.trim() ||
    "247 AI Employees <onboarding@resend.dev>"

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
