import "server-only"

import { Resend } from "resend"

const BRAND_NAME = "247 AI Employees"

function authFromAddress(): string {
  return (
    process.env.AUTOMATION_EMAIL_FROM?.trim() ||
    `${BRAND_NAME} <hello@247aiemployees.net>`
  )
}

function getResendKey(): string | null {
  return process.env.RESEND_API_KEY?.trim() || process.env.RESEND_API_KEY_247AI?.trim() || null
}

function brandedHtml(title: string, body: string, ctaLabel: string, ctaUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#141414;border:1px solid #262626;border-radius:12px;padding:32px;">
        <tr><td style="text-align:center;padding-bottom:24px;">
          <span style="font-size:20px;font-weight:700;color:#ffffff;">${BRAND_NAME}</span>
        </td></tr>
        <tr><td style="color:#e5e5e5;font-size:16px;line-height:1.6;padding-bottom:16px;">
          <h1 style="color:#ffffff;font-size:22px;margin:0 0 12px;">${title}</h1>
          ${body}
        </td></tr>
        <tr><td style="padding:24px 0;text-align:center;">
          <a href="${ctaUrl}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">${ctaLabel}</a>
        </td></tr>
        <tr><td style="color:#737373;font-size:12px;line-height:1.5;padding-top:16px;border-top:1px solid #262626;">
          If you didn't request this, you can safely ignore this email.
          <br><br>
          &copy; ${new Date().getFullYear()} ${BRAND_NAME}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendAuthConfirmationEmail(input: {
  to: string
  name?: string
  confirmUrl: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = getResendKey()
  if (!key) {
    return { ok: false, error: "Email service not configured (RESEND_API_KEY)" }
  }

  const greeting = input.name?.trim() ? `Hi ${input.name.trim()},` : "Hi there,"
  const resend = new Resend(key)
  const { error } = await resend.emails.send({
    from: authFromAddress(),
    to: [input.to],
    subject: `Confirm your ${BRAND_NAME} account`,
    html: brandedHtml(
      "Confirm your email",
      `<p style="margin:0 0 12px;">${greeting}</p>
       <p style="margin:0;">Thanks for signing up! Click the button below to confirm your email and activate your account.</p>`,
      "Confirm Email",
      input.confirmUrl,
    ),
    text: `${greeting}\n\nConfirm your ${BRAND_NAME} account: ${input.confirmUrl}`,
  })

  if (error) {
    return { ok: false, error: typeof error === "string" ? error : error.message || "Email send failed" }
  }
  return { ok: true }
}

export async function sendAuthPasswordResetEmail(input: {
  to: string
  name?: string
  resetUrl: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = getResendKey()
  if (!key) {
    return { ok: false, error: "Email service not configured (RESEND_API_KEY)" }
  }

  const greeting = input.name?.trim() ? `Hi ${input.name.trim()},` : "Hi there,"
  const resend = new Resend(key)
  const { error } = await resend.emails.send({
    from: authFromAddress(),
    to: [input.to],
    subject: `Reset your ${BRAND_NAME} password`,
    html: brandedHtml(
      "Reset your password",
      `<p style="margin:0 0 12px;">${greeting}</p>
       <p style="margin:0;">We received a request to reset your password. Click the button below to choose a new one. This link expires in 24 hours.</p>`,
      "Reset Password",
      input.resetUrl,
    ),
    text: `${greeting}\n\nReset your password: ${input.resetUrl}`,
  })

  if (error) {
    return { ok: false, error: typeof error === "string" ? error : error.message || "Email send failed" }
  }
  return { ok: true }
}
