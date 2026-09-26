import { NextResponse } from "next/server"
import { requireEmailAssistantAccess } from "@/lib/gmail/access"
import { deleteGmailConnection, getGmailConnection } from "@/lib/gmail/client"
import { recordAuditLog } from "@/lib/audit-log"

export async function GET() {
  const gate = await requireEmailAssistantAccess()
  if (!gate.ok) return gate.response

  const configured = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
  )

  const row = await getGmailConnection(gate.userId)
  return NextResponse.json({
    configured,
    connected: Boolean(row),
    email: row?.email ?? null,
    connectedAt: row?.connected_at ?? null,
  })
}

export async function DELETE(request: Request) {
  const gate = await requireEmailAssistantAccess()
  if (!gate.ok) return gate.response

  await deleteGmailConnection(gate.userId)
  await recordAuditLog({
    workspaceOwnerId: gate.userId,
    actorUserId: gate.userId,
    source: "dashboard",
    action: "gmail.disconnect",
    resourceType: "user_gmail_connections",
    resourceId: gate.userId,
    request,
  })

  return NextResponse.json({ success: true })
}
