import { createClient } from "@/lib/supabase/server"
import { AI_EMPLOYEES } from "@/lib/products"
import { NextRequest } from "next/server"
import { validateApiKey, logApiRequest } from "@/lib/api-auth"

// User-facing tasks API with API key support

async function getAuthenticatedUser(request: NextRequest): Promise<{ userId: string | null; apiKeyId: string | null; error?: string }> {
  const authHeader = request.headers.get("Authorization")
  
  if (authHeader?.startsWith("Bearer 247ai_")) {
    const auth = await validateApiKey(request)
    if (!auth.valid || !auth.data) {
      return { userId: null, apiKeyId: null, error: auth.error }
    }
    if (!auth.data.permissions.tasks) {
      return { userId: null, apiKeyId: null, error: "API key does not have tasks permission" }
    }
    return { userId: auth.data.user_id, apiKeyId: auth.data.id }
  }
  
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return { userId: null, apiKeyId: null, error: "Unauthorized" }
  }
  
  return { userId: user.id, apiKeyId: null }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { userId, apiKeyId, error: authError } = await getAuthenticatedUser(request)
    
    if (!userId) {
      if (apiKeyId) await logApiRequest(apiKeyId, null, "/api/tasks", "GET", 401, Date.now() - startTime, request)
      return Response.json({ error: authError || "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const employee_id = searchParams.get("employee_id")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    let query = supabase
      .from("tasks")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq("status", status)
    }
    if (employee_id) {
      query = query.eq("ai_employee_id", employee_id)
    }

    const { data: tasks, error, count } = await query

    if (error) {
      if (apiKeyId) await logApiRequest(apiKeyId, userId, "/api/tasks", "GET", 500, Date.now() - startTime, request)
      return Response.json({ error: "Failed to fetch tasks" }, { status: 500 })
    }

    // Enrich with employee info
    const enrichedTasks = tasks?.map(task => {
      const employee = AI_EMPLOYEES.find(e => e.id === task.ai_employee_id)
      return {
        ...task,
        employee_name: employee?.name || "Unknown",
        employee_role: employee?.role || "Unknown"
      }
    })

    if (apiKeyId) await logApiRequest(apiKeyId, userId, "/api/tasks", "GET", 200, Date.now() - startTime, request)
    return Response.json({ tasks: enrichedTasks, total: count })

  } catch (error) {
    console.error("Tasks API error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { userId, apiKeyId, error: authError } = await getAuthenticatedUser(request)
    
    if (!userId) {
      if (apiKeyId) await logApiRequest(apiKeyId, null, "/api/tasks", "POST", 401, Date.now() - startTime, request)
      return Response.json({ error: authError || "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()
    const { employee_id, prompt, title, priority = "normal" } = body

    if (!employee_id || !prompt) {
      if (apiKeyId) await logApiRequest(apiKeyId, userId, "/api/tasks", "POST", 400, Date.now() - startTime, request)
      return Response.json(
        { error: "Missing required fields: employee_id, prompt" },
        { status: 400 }
      )
    }

    const employee = AI_EMPLOYEES.find(e => e.id === employee_id)
    if (!employee) {
      if (apiKeyId) await logApiRequest(apiKeyId, userId, "/api/tasks", "POST", 400, Date.now() - startTime, request)
      return Response.json({ error: "Invalid employee_id" }, { status: 400 })
    }

    // Check user tier and limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, tasks_used, tasks_limit")
      .eq("id", userId)
      .single()

    if (!profile) {
      if (apiKeyId) await logApiRequest(apiKeyId, userId, "/api/tasks", "POST", 404, Date.now() - startTime, request)
      return Response.json({ error: "Profile not found" }, { status: 404 })
    }

    const tierOrder = { personal: 1, entrepreneur: 2, business: 3, enterprise: 4 }
    const userTierLevel = tierOrder[profile.subscription_tier as keyof typeof tierOrder] || 0
    const requiredTierLevel = tierOrder[employee.tier_required as keyof typeof tierOrder] || 0

    if (userTierLevel < requiredTierLevel) {
      if (apiKeyId) await logApiRequest(apiKeyId, userId, "/api/tasks", "POST", 403, Date.now() - startTime, request)
      return Response.json(
        { error: `Upgrade to ${employee.tier_required} to use this AI employee` },
        { status: 403 }
      )
    }

    if (profile.tasks_used >= profile.tasks_limit) {
      if (apiKeyId) await logApiRequest(apiKeyId, userId, "/api/tasks", "POST", 429, Date.now() - startTime, request)
      return Response.json(
        { error: "Task limit reached. Upgrade your plan for more tasks." },
        { status: 429 }
      )
    }

    // Create task
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        ai_employee_id: employee_id,
        title: title || `${employee.name} Task`,
        prompt,
        priority,
        trigger_type: apiKeyId ? "api" : "manual",
        status: "pending",
        metadata: apiKeyId ? { api_key_id: apiKeyId } : {}
      })
      .select()
      .single()

    if (taskError) {
      if (apiKeyId) await logApiRequest(apiKeyId, userId, "/api/tasks", "POST", 500, Date.now() - startTime, request)
      return Response.json({ error: "Failed to create task" }, { status: 500 })
    }

    // Trigger processing
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/tasks/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: task.id })
    }).catch(() => {})

    if (apiKeyId) await logApiRequest(apiKeyId, userId, "/api/tasks", "POST", 201, Date.now() - startTime, request)
    return Response.json({ task, message: "Task queued for processing" }, { status: 201 })

  } catch (error) {
    console.error("Create task error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
