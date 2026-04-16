import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    // Update conversation to needs_human
    await supabaseAdmin
      .from("support_conversations")
      .update({ 
        needs_human: true,
        updated_at: new Date().toISOString()
      })
      .eq("session_id", sessionId)

    // In production, send email notification to admin
    console.log("[v0] Human support requested:", {
      to: "gvenz33@gmail.com",
      sessionId,
      timestamp: new Date().toISOString()
    })

    // TODO: Integrate with email service (Resend/SendGrid) to notify gvenz33@gmail.com

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error requesting human support:", error)
    return NextResponse.json(
      { error: "Failed to request human support" },
      { status: 500 }
    )
  }
}
