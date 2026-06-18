import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEmployeeById } from "@/lib/products"
import { buildChatDocxBuffer } from "@/lib/export/chat-docx"
import { buildChatPdfBuffer } from "@/lib/export/chat-pdf"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const format = request.nextUrl.searchParams.get("format") || "pdf"

  if (format !== "pdf" && format !== "docx") {
    return NextResponse.json({ error: "format must be pdf or docx" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: session } = await supabase
    .from("employee_chat_sessions")
    .select("id, employee_id, title")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single()

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  const employee = getEmployeeById(session.employee_id)
  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 })
  }

  const { data: messages } = await supabase
    .from("employee_chat_messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })

  if (!messages?.length) {
    return NextResponse.json({ error: "No messages to export" }, { status: 400 })
  }

  const exportedAt = new Date().toLocaleString()
  const payload = {
    employeeName: employee.name,
    employeeRole: employee.role,
    sessionTitle: session.title || "Conversation",
    exportedAt,
    messages,
  }

  const safeName = employee.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()

  if (format === "docx") {
    const buffer = await buildChatDocxBuffer(payload)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName}-chat.docx"`,
      },
    })
  }

  const buffer = buildChatPdfBuffer(payload)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}-chat.pdf"`,
    },
  })
}
