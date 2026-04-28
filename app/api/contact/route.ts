import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const {
      name,
      email,
      message,
      inquiryType,
      companyName,
      companySize,
      budgetRange,
      timeline,
    } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      )
    }

    const normalizedType =
      inquiryType === "founders" || inquiryType === "general" ? inquiryType : "general"

    if (normalizedType === "founders") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
      await (getSupabaseAdmin() as any).from("founders_leads").insert({
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        company_name: companyName ? String(companyName).trim() : null,
        company_size: companySize ? String(companySize).trim() : null,
        budget_range: budgetRange ? String(budgetRange).trim() : null,
        timeline: timeline ? String(timeline).trim() : null,
        message: String(message).trim(),
        source: "contact_form",
        status: "new",
      })
    }

    console.log("[v0] Contact form submission:", {
      to: "hello@247aiemployees.net",
      from: email,
      name,
      message,
      inquiryType: normalizedType,
      companyName,
      companySize,
      budgetRange,
      timeline,
      timestamp: new Date().toISOString()
    })

    // In production, integrate with Resend or SendGrid:
    // await resend.emails.send({
    //   from: 'noreply@247aiemployees.net',
    //   to: 'hello@247aiemployees.net',
    //   subject: `Contact Form: ${name}`,
    //   html: `<p><strong>From:</strong> ${name} (${email})</p><p>${message}</p>`
    // })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Contact form error:", error)
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    )
  }
}
