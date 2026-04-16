import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      )
    }

    // Send email using a simple fetch to an email service
    // For production, you'd use Resend, SendGrid, or similar
    // For now, we'll store it and log it
    
    console.log("[v0] Contact form submission:", {
      to: "hello@247aiemployees.net",
      from: email,
      name,
      message,
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
