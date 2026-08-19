import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { getAuthCallbackUrl } from "@/lib/auth-redirect"
import { sendAuthConfirmationEmail } from "@/lib/send-auth-email"

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, referral_code } = await request.json()
    const origin = new URL(request.url).origin

    const normalizedEmail = String(email || "").trim().toLowerCase()
    if (!normalizedEmail || !password || String(password).length < 8) {
      return NextResponse.json({ error: "Valid email and password (min 8 characters) are required" }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const callbackUrl = getAuthCallbackUrl(origin)

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "signup",
      email: normalizedEmail,
      password: String(password),
      options: {
        redirectTo: callbackUrl,
        data: {
          full_name: full_name ? String(full_name).trim() : "",
          referral_code: referral_code || null,
        },
      },
    })

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 400 })
    }

    const confirmUrl = linkData?.properties?.action_link
    if (!confirmUrl) {
      return NextResponse.json({ error: "Failed to generate confirmation link" }, { status: 500 })
    }

    const emailResult = await sendAuthConfirmationEmail({
      to: normalizedEmail,
      name: full_name ? String(full_name).trim() : undefined,
      confirmUrl,
    })

    if (!emailResult.ok) {
      return NextResponse.json({ error: emailResult.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[auth/sign-up] Error:", error)
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
  }
}
