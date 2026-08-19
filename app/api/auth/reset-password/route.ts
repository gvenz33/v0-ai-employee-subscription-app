import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { getAuthCallbackUrl } from "@/lib/auth-redirect"
import { sendAuthPasswordResetEmail } from "@/lib/send-auth-email"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    const origin = new URL(request.url).origin

    const normalizedEmail = String(email || "").trim().toLowerCase()
    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const callbackUrl = getAuthCallbackUrl(origin, "/auth/reset-password")

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: { redirectTo: callbackUrl },
    })

    if (linkError) {
      // Don't reveal whether the email exists
      if (linkError.message?.toLowerCase().includes("user not found")) {
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: linkError.message }, { status: 400 })
    }

    const resetUrl = linkData?.properties?.action_link
    if (!resetUrl) {
      return NextResponse.json({ error: "Failed to generate reset link" }, { status: 500 })
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("email", normalizedEmail)
      .maybeSingle()

    const emailResult = await sendAuthPasswordResetEmail({
      to: normalizedEmail,
      name: profile?.full_name,
      resetUrl,
    })

    if (!emailResult.ok) {
      return NextResponse.json({ error: emailResult.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[auth/reset-password] Error:", error)
    return NextResponse.json({ error: "Failed to send reset email" }, { status: 500 })
  }
}
