import { NextResponse } from "next/server"
import { validateApiKey, logApiRequest } from "@/lib/api-auth"
import { createClient } from "@/lib/supabase/server"
import { AI_EMPLOYEES, getEmployeeById } from "@/lib/products"

// Available action types
const ACTION_TYPES = [
  "generate_content",
  "analyze_data",
  "create_report",
  "send_notification",
  "schedule_task",
  "execute_workflow",
  "process_document",
  "summarize_text",
] as const

export async function POST(request: Request) {
  const startTime = Date.now()
  
  // Validate API key
  const auth = await validateApiKey(request)
  
  if (!auth.valid || !auth.data) {
    await logApiRequest(null, null, "/api/actions", "POST", 401, Date.now() - startTime, request)
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  if (!auth.data.permissions.actions) {
    await logApiRequest(auth.data.id, auth.data.user_id, "/api/actions", "POST", 403, Date.now() - startTime, request)
    return NextResponse.json({ error: "API key does not have actions permission" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action, employee_id, params } = body

    // Validate action type
    if (!action || !ACTION_TYPES.includes(action)) {
      await logApiRequest(auth.data.id, auth.data.user_id, "/api/actions", "POST", 400, Date.now() - startTime, request)
      return NextResponse.json({ 
        error: "Invalid action type", 
        valid_actions: ACTION_TYPES 
      }, { status: 400 })
    }

    // Validate employee if provided
    let employee = null
    if (employee_id) {
      employee = getEmployeeById(employee_id)
      if (!employee) {
        await logApiRequest(auth.data.id, auth.data.user_id, "/api/actions", "POST", 400, Date.now() - startTime, request)
        return NextResponse.json({ error: "Invalid employee_id" }, { status: 400 })
      }
    }

    const supabase = await createClient()

    // Check user's task limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("tasks_used, tasks_limit, subscription_tier")
      .eq("id", auth.data.user_id)
      .single()

    if (profile && profile.tasks_used >= profile.tasks_limit) {
      await logApiRequest(auth.data.id, auth.data.user_id, "/api/actions", "POST", 429, Date.now() - startTime, request)
      return NextResponse.json({ 
        error: "Task limit exceeded",
        tasks_used: profile.tasks_used,
        tasks_limit: profile.tasks_limit,
      }, { status: 429 })
    }

    // Create the action/task in the queue
    const actionId = crypto.randomUUID()
    
    const { error: taskError } = await supabase.from("tasks").insert({
      id: actionId,
      user_id: auth.data.user_id,
      employee_id: employee_id || null,
      type: action,
      status: "pending",
      input: params || {},
      metadata: {
        source: "api",
        api_key_id: auth.data.id,
      },
    })

    if (taskError) {
      await logApiRequest(auth.data.id, auth.data.user_id, "/api/actions", "POST", 500, Date.now() - startTime, request)
      return NextResponse.json({ error: "Failed to create action" }, { status: 500 })
    }

    // Increment task usage
    await supabase
      .from("profiles")
      .update({ tasks_used: (profile?.tasks_used || 0) + 1 })
      .eq("id", auth.data.user_id)

    const response = {
      success: true,
      action_id: actionId,
      action: action,
      employee: employee ? { id: employee.id, name: employee.name } : null,
      status: "pending",
      created_at: new Date().toISOString(),
      message: "Action queued successfully. Use GET /api/status?action_id=<id> to check progress.",
    }

    await logApiRequest(auth.data.id, auth.data.user_id, "/api/actions", "POST", 201, Date.now() - startTime, request)
    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    await logApiRequest(auth.data.id, auth.data.user_id, "/api/actions", "POST", 500, Date.now() - startTime, request)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET available actions
export async function GET(request: Request) {
  const startTime = Date.now()
  
  const auth = await validateApiKey(request)
  
  if (!auth.valid || !auth.data) {
    await logApiRequest(null, null, "/api/actions", "GET", 401, Date.now() - startTime, request)
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const response = {
    available_actions: ACTION_TYPES.map(action => ({
      type: action,
      description: getActionDescription(action),
    })),
    available_employees: AI_EMPLOYEES.map(emp => ({
      id: emp.id,
      name: emp.name,
      role: emp.role,
      tier: emp.tier,
    })),
  }

  await logApiRequest(auth.data.id, auth.data.user_id, "/api/actions", "GET", 200, Date.now() - startTime, request)
  return NextResponse.json(response)
}

function getActionDescription(action: string): string {
  const descriptions: Record<string, string> = {
    generate_content: "Generate text content (articles, emails, copy)",
    analyze_data: "Analyze provided data and return insights",
    create_report: "Create a formatted report from data",
    send_notification: "Send a notification or alert",
    schedule_task: "Schedule a task for future execution",
    execute_workflow: "Execute a predefined workflow",
    process_document: "Process and extract info from a document",
    summarize_text: "Summarize provided text content",
  }
  return descriptions[action] || "Perform the specified action"
}
