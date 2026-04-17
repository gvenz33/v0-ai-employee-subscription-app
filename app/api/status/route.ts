import { NextResponse } from "next/server"
import { validateApiKey, logApiRequest } from "@/lib/api-auth"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const startTime = Date.now()
  
  // Validate API key
  const auth = await validateApiKey(request)
  
  if (!auth.valid || !auth.data) {
    await logApiRequest(null, null, "/api/status", "GET", 401, Date.now() - startTime, request)
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  if (!auth.data.permissions.status) {
    await logApiRequest(auth.data.id, auth.data.user_id, "/api/status", "GET", 403, Date.now() - startTime, request)
    return NextResponse.json({ error: "API key does not have status permission" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const actionId = searchParams.get("action_id")
  const taskId = searchParams.get("task_id")

  const supabase = await createClient()

  try {
    // If specific action/task ID provided, return that status
    if (actionId || taskId) {
      const id = actionId || taskId
      
      const { data: task, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .eq("user_id", auth.data.user_id)
        .single()

      if (error || !task) {
        await logApiRequest(auth.data.id, auth.data.user_id, "/api/status", "GET", 404, Date.now() - startTime, request)
        return NextResponse.json({ error: "Task not found" }, { status: 404 })
      }

      const response = {
        task_id: task.id,
        type: task.type,
        status: task.status,
        employee_id: task.employee_id,
        input: task.input,
        output: task.output,
        error: task.error,
        created_at: task.created_at,
        started_at: task.started_at,
        completed_at: task.completed_at,
        execution_time_ms: task.completed_at && task.started_at 
          ? new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()
          : null,
      }

      await logApiRequest(auth.data.id, auth.data.user_id, "/api/status", "GET", 200, Date.now() - startTime, request)
      return NextResponse.json(response)
    }

    // Otherwise return overall account status
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", auth.data.user_id)
      .single()

    // Get recent tasks count
    const { count: pendingTasks } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", auth.data.user_id)
      .eq("status", "pending")

    const { count: runningTasks } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", auth.data.user_id)
      .eq("status", "running")

    const { count: completedToday } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", auth.data.user_id)
      .eq("status", "completed")
      .gte("completed_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    // Get API usage stats
    const { count: apiCallsToday } = await supabase
      .from("api_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", auth.data.user_id)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const response = {
      api_status: "operational",
      timestamp: new Date().toISOString(),
      user: {
        id: auth.data.user_id,
        subscription_tier: profile?.subscription_tier || "personal",
        tasks_used: profile?.tasks_used || 0,
        tasks_limit: profile?.tasks_limit || 100,
        tasks_remaining: Math.max(0, (profile?.tasks_limit || 100) - (profile?.tasks_used || 0)),
      },
      queue: {
        pending: pendingTasks || 0,
        running: runningTasks || 0,
        completed_today: completedToday || 0,
      },
      api_usage: {
        calls_today: apiCallsToday || 0,
        rate_limit: profile?.subscription_tier === "enterprise" ? 100 : 30,
        rate_limit_window: "per minute",
      },
      endpoints: {
        chat: "/api/chat",
        tasks: "/api/tasks",
        plan: "/api/plan",
        actions: "/api/actions",
        status: "/api/status",
      },
    }

    await logApiRequest(auth.data.id, auth.data.user_id, "/api/status", "GET", 200, Date.now() - startTime, request)
    return NextResponse.json(response)

  } catch (error) {
    await logApiRequest(auth.data.id, auth.data.user_id, "/api/status", "GET", 500, Date.now() - startTime, request)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
