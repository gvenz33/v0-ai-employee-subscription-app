import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, TrendingUp, Clock } from "lucide-react"
import Link from "next/link"
import { AI_EMPLOYEES } from "@/lib/products"
import { TaskUsageCard } from "@/components/dashboard/task-usage-card"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single()

  const { data: aiEmployees } = await supabase
    .from("ai_employees")
    .select("*")
    .eq("user_id", user?.id)

  const { data: recentTasks } = await supabase
    .from("task_logs")
    .select("*")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(5)

  const activeEmployees = aiEmployees?.filter(e => e.is_active).length || 0
  const totalTasks = profile?.tasks_used || 0
  const taskLimit = profile?.tasks_limit || 50
  const usagePercent = Math.round((totalTasks / taskLimit) * 100)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s your AI workforce overview.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/employees">Manage Employees</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activeEmployees}</div>
            <p className="text-xs text-muted-foreground">of {AI_EMPLOYEES.length} available</p>
          </CardContent>
        </Card>

        <TaskUsageCard 
          tasksUsed={totalTasks} 
          taskLimit={taskLimit} 
          subscriptionTier={profile?.subscription_tier || "personal"} 
        />

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasks Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {recentTasks?.filter(t => {
                const today = new Date()
                const taskDate = new Date(t.created_at)
                return taskDate.toDateString() === today.toDateString()
              }).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">completed today</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">2.3s</div>
            <p className="text-xs text-muted-foreground">response time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Start</CardTitle>
            <CardDescription>Get started with your AI employees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg">1</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Browse AI Employees</p>
                <p className="text-sm text-muted-foreground">Explore our AI workforce and find the right fit</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg">2</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Activate an Employee</p>
                <p className="text-sm text-muted-foreground">Enable the AI agents you want to work with</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg">3</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Start Chatting</p>
                <p className="text-sm text-muted-foreground">Interact with your AI employees through chat</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Activity</CardTitle>
            <CardDescription>Your latest AI employee tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTasks && recentTasks.length > 0 ? (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{task.task_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(task.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No tasks yet</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/dashboard/employees">Start with an AI employee</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
