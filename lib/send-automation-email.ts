import "server-only"

import nodemailer from "nodemailer"
import { Resend } from "resend"

/**
 * Outgoing mail for automations: SiteGround SMTP (or any SMTP) when configured, else Resend.
 * IMAP (e.g. port 993) is only for reading mail in a client — sending uses SMTP only.
 *
 * SMTP (SiteGround example): host gcam1302.siteground.biz, port 465, SSL.
 * Set SMTP_USER / SMTP_PASSWORD to your mailbox. If SMTP_HOST is omitted but user+pass
 * are set, host defaults to gcam1302.siteground.biz.
 */

function resolveFromAddress(): string {
  return (
    process.env.AUTOMATION_EMAIL_FROM?.trim() ||
    "247 AI Employees <hello@247aiemployees.net>"
  )
}

function getSmtpConfig():
  | {
      host: string
      port: number
      secure: boolean
      auth: { user: string; pass: string }
    }
  | null {
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASSWORD?.trim()
  const host =
    process.env.SMTP_HOST?.trim() ||
    (user && pass ? "gcam1302.siteground.biz" : "")
  if (!host || !user || !pass) return null

  const port = Number(process.env.SMTP_PORT || "465")
  const secure =
    process.env.SMTP_SECURE === "false"
      ? false
      : process.env.SMTP_SECURE === "true" || port === 465 || port === 994

  return {
    host,
    port,
    secure,
    auth: { user, pass },
  }
}

async function sendViaSmtp(
  input: { to: string; subject: string; bodyText: string },
  from: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cfg = getSmtpConfig()
  if (!cfg) {
    return { ok: false, error: "SMTP is not fully configured (SMTP_USER, SMTP_PASSWORD)" }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.auth,
    })
    await transporter.sendMail({
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
  }
}

async function sendViaResend(
  input: { to: string; subject: string; bodyText: string },
  from: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    return { ok: false, error: "RESEND_API_KEY is not configured" }
  }

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

export async function sendAutomationDigestEmail(input: {
  to: string
  subject: string
  bodyText: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const from = resolveFromAddress()

  if (getSmtpConfig()) {
    const smtpResult = await sendViaSmtp(input, from)
    if (smtpResult.ok) return smtpResult
    const resendFallback = await sendViaResend(input, from)
    if (resendFallback.ok) return resendFallback
    return {
      ok: false,
      error: `SMTP: ${smtpResult.error}; Resend fallback: ${resendFallback.error}`,
    }
  }

  return sendViaResend(input, from)
}
