import { createClient } from "@/lib/supabase/server"
import { AI_EMPLOYEES } from "@/lib/products"
import { NextRequest } from "next/server"

// User-facing tasks API

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const employee_id = searchParams.get("employee_id")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    let query = supabase
      .from("tasks")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
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

    return Response.json({ tasks: enrichedTasks, total: count })

  } catch (error) {
    console.error("Tasks API error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { employee_id, prompt, title, priority = "normal" } = body

    if (!employee_id || !prompt) {
      return Response.json(
        { error: "Missing required fields: employee_id, prompt" },
        { status: 400 }
      )
    }

    const employee = AI_EMPLOYEES.find(e => e.id === employee_id)
    if (!employee) {
      return Response.json({ error: "Invalid employee_id" }, { status: 400 })
    }

    // Check user tier and limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, tasks_used, tasks_limit")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return Response.json({ error: "Profile not found" }, { status: 404 })
    }

    const tierOrder = { starter: 1, pro: 2, enterprise: 3 }
    const userTierLevel = tierOrder[profile.subscription_tier as keyof typeof tierOrder] || 0
    const requiredTierLevel = tierOrder[employee.tierRequired as keyof typeof tierOrder] || 0

    if (userTierLevel < requiredTierLevel) {
      return Response.json(
        { error: `Upgrade to ${employee.tierRequired} to use this AI employee` },
        { status: 403 }
      )
    }

    if (profile.tasks_used >= profile.tasks_limit) {
      return Response.json(
        { error: "Task limit reached. Upgrade your plan for more tasks." },
        { status: 429 }
      )
    }

    // Create task
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        ai_employee_id: employee_id,
        title: title || `${employee.name} Task`,
        prompt,
        priority,
        trigger_type: "manual",
        status: "pending"
      })
      .select()
      .single()

    if (taskError) {
      return Response.json({ error: "Failed to create task" }, { status: 500 })
    }

    // Trigger processing
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/tasks/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: task.id })
    }).catch(() => {})

    return Response.json({ task, message: "Task queued for processing" })

  } catch (error) {
    console.error("Create task error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
