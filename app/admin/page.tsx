import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MessageSquare, DollarSign, Share2, Bot, AlertCircle } from "lucide-react"
import Link from "next/link"

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Fetch stats
  const [
    { count: totalUsers },
    { count: activeConversations },
    { count: pendingHumanSupport },
    { count: totalAffiliates },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("support_conversations").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("support_conversations").select("*", { count: "exact", head: true }).eq("needs_human", true),
    supabase.from("affiliates").select("*", { count: "exact", head: true }),
  ])

  // Get recent support requests needing human
  const { data: urgentSupport } = await supabase
    .from("support_conversations")
    .select("*")
    .eq("needs_human", true)
    .order("created_at", { ascending: false })
    .limit(5)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage users, support, and platform settings</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalUsers || 0}</div>
            <Link href="/admin/users" className="text-xs text-primary hover:underline">
              Manage users
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Support Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activeConversations || 0}</div>
            <Link href="/admin/support" className="text-xs text-primary hover:underline">
              View conversations
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Needs Human Support</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{pendingHumanSupport || 0}</div>
            <Link href="/admin/support?filter=human" className="text-xs text-primary hover:underline">
              Respond now
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Affiliates</CardTitle>
            <Share2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalAffiliates || 0}</div>
            <Link href="/admin/affiliates" className="text-xs text-primary hover:underline">
              Manage affiliates
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Support Requests */}
      {urgentSupport && urgentSupport.length > 0 && (
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-500">
              <AlertCircle className="h-5 w-5" />
              Urgent: Human Support Requested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {urgentSupport.map((conv) => (
                <div key={conv.id} className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <div>
                    <p className="text-sm font-medium text-foreground">Session: {conv.session_id.slice(0, 20)}...</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(conv.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    href={`/admin/support/${conv.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Respond
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/admin/users">
          <Card className="bg-card border-border hover:border-primary transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">User Management</h3>
                  <p className="text-sm text-muted-foreground">Add, edit, or manage user accounts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/agents">
          <Card className="bg-card border-border hover:border-primary transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">AI Agents</h3>
                  <p className="text-sm text-muted-foreground">Enable/disable agents per user</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/affiliates">
          <Card className="bg-card border-border hover:border-primary transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Affiliate Program</h3>
                  <p className="text-sm text-muted-foreground">Manage commissions and payouts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
