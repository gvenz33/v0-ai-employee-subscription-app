import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"
import { decryptAutomationSecret } from "@/lib/automation-email-crypto"

export type UserAutomationEmailRow = {
  provider: "gmail" | "outlook" | "smtp"
  from_name: string | null
  from_email: string
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  smtp_user: string
  smtp_password_encrypted: string
}

function formatFrom(row: Pick<UserAutomationEmailRow, "from_name" | "from_email">): string {
  const email = row.from_email.trim()
  const name = row.from_name?.trim()
  if (name) return `${name} <${email}>`
  return email
}

/** Load and decrypt user SMTP; returns null if not configured or decrypt fails. */
export async function getUserAutomationSmtp(
  supabase: SupabaseClient,
  userId: string
): Promise<{ from: string; transport: nodemailer.Transporter } | null> {
  const { data, error } = await supabase
    .from("user_automation_email_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !data) return null

  const row = data as UserAutomationEmailRow & { user_id: string }
  let password: string
  try {
    password = decryptAutomationSecret(row.smtp_password_encrypted)
  } catch {
    return null
  }

  const from = formatFrom(row)

  const transport = nodemailer.createTransport({
    host: row.smtp_host,
    port: row.smtp_port,
    secure: row.smtp_secure,
    auth: {
      user: row.smtp_user,
      pass: password,
    },
    ...(row.smtp_port === 587 && !row.smtp_secure
      ? { requireTLS: true }
      : {}),
  })

  return { from, transport }
}
