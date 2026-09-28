import { NextResponse } from "next/server"
import { requireEmailAssistantAccess } from "@/lib/gmail/access"
import {
  countGmailConnections,
  deleteGmailConnection,
  listGmailConnections,
  MAX_GMAIL_ACCOUNTS,
} from "@/lib/gmail/client"
import { recordAuditLog } from "@/lib/audit-log"

export async function GET() {
  const gate = await requireEmailAssistantAccess()
  if (!gate.ok) return gate.response

  const configured = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
  )

  const accounts = await listGmailConnections(gate.userId)
  return NextResponse.json({
    configured,
    connected: accounts.length > 0,
    maxAccounts: MAX_GMAIL_ACCOUNTS,
    accountCount: accounts.length,
    canConnectMore: accounts.length < MAX_GMAIL_ACCOUNTS,
    accounts: accounts.map((a) => ({
      id: a.id,
      email: a.email,
      connectedAt: a.connected_at ?? null,
    })),
    // legacy single-account fields
    email: accounts[0]?.email ?? null,
    connectedAt: accounts[0]?.connected_at ?? null,
  })
}

export async function DELETE(request: Request) {
  const gate = await requireEmailAssistantAccess()
  if (!gate.ok) return gate.response

  const url = new URL(request.url)
  const connectionId =
    url.searchParams.get("connectionId") ||
    ((await request.json().catch(() => null)) as { connectionId?: string } | null)?.connectionId

  if (!connectionId) {
    return NextResponse.json(
      { error: "Pass connectionId to disconnect a specific Gmail account." },
      { status: 400 },
    )
  }

  await deleteGmailConnection(gate.userId, connectionId)
  const remaining = await countGmailConnections(gate.userId)

  await recordAuditLog({
    workspaceOwnerId: gate.userId,
    actorUserId: gate.userId,
    source: "dashboard",
    action: "gmail.disconnect",
    resourceType: "user_gmail_connections",
    resourceId: connectionId,
    details: { remaining },
    request,
  })

  return NextResponse.json({ success: true, remaining })
}
