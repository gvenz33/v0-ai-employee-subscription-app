import { createClient } from "@/lib/supabase/server"
import { z } from "zod"
import { encryptAutomationSecret } from "@/lib/automation-email-crypto"

const postSchema = z.object({
  provider: z.enum(["gmail", "outlook", "smtp"]),
  from_name: z.string().max(120).optional().nullable(),
  from_email: z.string().email().max(320),
  smtp_user: z.string().min(1).max(320),
  /** Omit or empty to keep existing password on update */
  smtp_password: z.string().max(500).optional(),
  smtp_host: z.string().max(200).optional(),
  smtp_port: z.coerce.number().int().min(1).max(65535).optional(),
  smtp_secure: z.boolean().optional(),
})

function applyPreset(
  provider: "gmail" | "outlook" | "smtp",
  custom?: { smtp_host?: string; smtp_port?: number; smtp_secure?: boolean }
) {
  if (provider === "gmail") {
    return { smtp_host: "smtp.gmail.com", smtp_port: 587, smtp_secure: false }
  }
  if (provider === "outlook") {
    return { smtp_host: "smtp.office365.com", smtp_port: 587, smtp_secure: false }
  }
  const host = custom?.smtp_host?.trim()
  if (!host) {
    throw new Error("SMTP host is required for custom provider")
  }
  return {
    smtp_host: host,
    smtp_port: custom?.smtp_port ?? 587,
    smtp_secure: custom?.smtp_secure ?? false,
  }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("user_automation_email_settings")
    .select(
      "provider, from_name, from_email, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password_encrypted"
    )
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    console.error("automation-email GET", error)
    return Response.json({ error: "Failed to load settings" }, { status: 500 })
  }

  if (!data) {
    return Response.json({
      configured: false,
      provider: null,
      from_name: "",
      from_email: user.email ?? "",
      smtp_host: "",
      smtp_port: 587,
      smtp_secure: false,
      smtp_user: user.email ?? "",
      has_password: false,
    })
  }

  return Response.json({
    configured: true,
    provider: data.provider,
    from_name: data.from_name ?? "",
    from_email: data.from_email,
    smtp_host: data.smtp_host,
    smtp_port: data.smtp_port,
    smtp_secure: data.smtp_secure,
    smtp_user: data.smtp_user,
    has_password: Boolean(data.smtp_password_encrypted),
  })
}

export async function POST(request: Request) {
  let body: z.infer<typeof postSchema>
  try {
    body = postSchema.parse(await request.json())
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  let preset: { smtp_host: string; smtp_port: number; smtp_secure: boolean }
  try {
    preset =
      body.provider === "smtp"
        ? applyPreset("smtp", {
            smtp_host: body.smtp_host,
            smtp_port: body.smtp_port,
            smtp_secure: body.smtp_secure,
          })
        : applyPreset(body.provider)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid SMTP settings"
    return Response.json({ error: msg }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from("user_automation_email_settings")
    .select("smtp_password_encrypted")
    .eq("user_id", user.id)
    .maybeSingle()

  let passwordEnc: string
  if (body.smtp_password && body.smtp_password.length > 0) {
    try {
      passwordEnc = encryptAutomationSecret(body.smtp_password)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Encryption unavailable"
      return Response.json(
        { error: `${msg}. Set AUTOMATION_EMAIL_SECRET on the server.` },
        { status: 503 }
      )
    }
  } else if (existing?.smtp_password_encrypted) {
    passwordEnc = existing.smtp_password_encrypted
  } else {
    return Response.json(
      { error: "Password or app password is required to save email sending settings." },
      { status: 400 }
    )
  }

  const row = {
    user_id: user.id,
    provider: body.provider,
    from_name: body.from_name?.trim() || null,
    from_email: body.from_email.trim().toLowerCase(),
    smtp_host: preset.smtp_host,
    smtp_port: preset.smtp_port,
    smtp_secure: preset.smtp_secure,
    smtp_user: body.smtp_user.trim(),
    smtp_password_encrypted: passwordEnc,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from("user_automation_email_settings").upsert(row, {
    onConflict: "user_id",
  })

  if (error) {
    console.error("automation-email upsert", error)
    return Response.json(
      {
        error:
          "Could not save. Run scripts/003_user_automation_email_settings.sql in Supabase if the table is missing.",
      },
      { status: 500 }
    )
  }

  return Response.json({ ok: true })
}

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { error } = await supabase.from("user_automation_email_settings").delete().eq("user_id", user.id)

  if (error) {
    return Response.json({ error: "Failed to remove settings" }, { status: 500 })
  }

  return Response.json({ ok: true })
}
