import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { buildEmailConfirmUrl } from "@/lib/auth-redirect"
import { sendAuthConfirmationEmail } from "@/lib/send-auth-email"

async function sendConfirmEmail(input: {
  origin: string
  email: string
  name?: string
  tokenHash: string
}) {
  const confirmUrl = buildEmailConfirmUrl({
    origin: input.origin,
    tokenHash: input.tokenHash,
    type: "email",
    next: "/dashboard",
  })

  return sendAuthConfirmationEmail({
    to: input.email,
    name: input.name,
    confirmUrl,
  })
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, referral_code } = await request.json()
    const origin = new URL(request.url).origin

    const normalizedEmail = String(email || "").trim().toLowerCase()
    const name = full_name ? String(full_name).trim() : undefined
    if (!normalizedEmail || !password || String(password).length < 8) {
      return NextResponse.json({ error: "Valid email and password (min 8 characters) are required" }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "signup",
      email: normalizedEmail,
      password: String(password),
      options: {
        redirectTo: `${origin}/dashboard`,
        data: {
          full_name: name || "",
          referral_code: referral_code || null,
        },
      },
    })

    if (!linkError) {
      const tokenHash = linkData?.properties?.hashed_token
      if (!tokenHash) {
        return NextResponse.json({ error: "Failed to generate confirmation link" }, { status: 500 })
      }

      const emailResult = await sendConfirmEmail({
        origin,
        email: normalizedEmail,
        name,
        tokenHash,
      })
      if (!emailResult.ok) {
        return NextResponse.json({ error: emailResult.error }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    // Account may already exist from a previous attempt with a broken confirmation link.
    const alreadyExists = /already|registered|exists/i.test(linkError.message || "")
    if (!alreadyExists) {
      return NextResponse.json({ error: linkError.message }, { status: 400 })
    }

    const { data: magicData, error: magicError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
      options: { redirectTo: `${origin}/dashboard` },
    })

    if (magicError) {
      return NextResponse.json(
        { error: "An account with this email already exists. Try signing in, or use Forgot password." },
        { status: 400 },
      )
    }

    const tokenHash = magicData?.properties?.hashed_token
    if (!tokenHash) {
      return NextResponse.json({ error: "Failed to generate confirmation link" }, { status: 500 })
    }

    const emailResult = await sendConfirmEmail({
      origin,
      email: normalizedEmail,
      name,
      tokenHash,
    })
    if (!emailResult.ok) {
      return NextResponse.json({ error: emailResult.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, resent: true })
  } catch (error) {
    console.error("[auth/sign-up] Error:", error)
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
  }
}
