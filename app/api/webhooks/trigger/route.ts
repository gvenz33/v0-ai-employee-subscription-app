"use server"

import { createClient } from "@/lib/supabase/server"
import { AI_EMPLOYEES } from "@/lib/products"
import { generateText } from "ai"
import { NextRequest } from "next/server"

// Webhook endpoint for external services to trigger AI tasks
// POST /api/webhooks/trigger
// Headers: x-api-key: user's API key
// Body: { employee_id, prompt, title?, priority?, metadata? }

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key")
    
    if (!apiKey) {
      return Response.json(
        { error: "Missing x-api-key header" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { employee_id, prompt, title, priority = "normal", metadata = {} } = body

    if (!employee_id || !prompt) {
      return Response.json(
        { error: "Missing required fields: employee_id, prompt" },
        { status: 400 }
      )
    }

    // Validate employee exists
    const employee = AI_EMPLOYEES.find(e => e.id === employee_id)
    if (!employee) {
      return Response.json(
        { error: `Invalid employee_id: ${employee_id}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Look up user by API key (stored in profiles.metadata)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, subscription_tier, tasks_used, tasks_limit")
      .eq("api_key", apiKey)
      .single()

    if (profileError || !profile) {
      return Response.json(
        { error: "Invalid API key" },
        { status: 401 }
      )
    }

    // Check tier access
    const tierOrder = { starter: 1, pro: 2, enterprise: 3 }
    const userTierLevel = tierOrder[profile.subscription_tier as keyof typeof tierOrder] || 0
    const requiredTierLevel = tierOrder[employee.tierRequired as keyof typeof tierOrder] || 0

    if (userTierLevel < requiredTierLevel) {
      return Response.json(
        { error: `This AI employee requires ${employee.tierRequired} tier or higher` },
        { status: 403 }
      )
    }

    // Check task limits
    if (profile.tasks_used >= profile.tasks_limit) {
      return Response.json(
        { error: "Task limit reached for this billing period" },
        { status: 429 }
      )
    }

    // Create the task
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        user_id: profile.id,
        ai_employee_id: employee_id,
        title: title || `${employee.name} Task`,
        prompt,
        priority,
        trigger_type: "webhook",
        webhook_source: request.headers.get("user-agent") || "unknown",
        metadata,
        status: "pending"
      })
      .select()
      .single()

    if (taskError) {
      console.error("Error creating task:", taskError)
      return Response.json(
        { error: "Failed to create task" },
        { status: 500 }
      )
    }

    // Process immediately if priority is high, otherwise return task ID
    if (priority === "high") {
      // Process synchronously for high priority
      const result = await processTask(task.id, employee, prompt, supabase)
      return Response.json({
        task_id: task.id,
        status: result.status,
        result: result.result,
        tokens_used: result.tokens_used
      })
    }

    // For normal/low priority, queue for background processing
    // Trigger background processing via edge function or cron
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/tasks/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: task.id })
    }).catch(() => {
      // Fire and forget - task will be picked up by cron if this fails
    })

    return Response.json({
      task_id: task.id,
      status: "queued",
      message: "Task queued for processing"
    })

  } catch (error) {
    console.error("Webhook error:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function processTask(
  taskId: string,
  employee: typeof AI_EMPLOYEES[0],
  prompt: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  try {
    // Update task status to processing
    await supabase
      .from("tasks")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", taskId)

    // Generate AI response
    const { text, usage } = await generateText({
      model: "openai/gpt-4o-mini",
      system: employee.systemPrompt,
      prompt
    })

    // Update task with result
    await supabase
      .from("tasks")
      .update({
        status: "completed",
        result: text,
        tokens_used: usage?.totalTokens || 0,
        completed_at: new Date().toISOString()
      })
      .eq("id", taskId)

    return { status: "completed", result: text, tokens_used: usage?.totalTokens || 0 }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    await supabase
      .from("tasks")
      .update({
        status: "failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      })
      .eq("id", taskId)

    return { status: "failed", result: null, tokens_used: 0, error: errorMessage }
  }
}

// GET endpoint to check webhook status
export async function GET() {
  return Response.json({
    status: "ok",
    endpoints: {
      trigger: "POST /api/webhooks/trigger",
      headers: { "x-api-key": "your-api-key" },
      body: {
        employee_id: "string (required)",
        prompt: "string (required)",
        title: "string (optional)",
        priority: "high | normal | low (optional, default: normal)",
        metadata: "object (optional)"
      },
      available_employees: AI_EMPLOYEES.map(e => ({
        id: e.id,
        name: e.name,
        role: e.role,
        tier_required: e.tierRequired
      }))
    }
  })
}
