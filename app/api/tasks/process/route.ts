"use server"

import { createClient } from "@/lib/supabase/server"
import { AI_EMPLOYEES } from "@/lib/products"
import { generateText } from "ai"
import { NextRequest } from "next/server"

// Background task processor
// Can be triggered by webhook, cron, or direct call

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { task_id } = body

    const supabase = await createClient()

    let tasks

    if (task_id) {
      // Process specific task
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", task_id)
        .eq("status", "pending")
        .single()

      if (error || !data) {
        return Response.json({ error: "Task not found or already processed" }, { status: 404 })
      }
      tasks = [data]
    } else {
      // Process batch of pending tasks (for cron jobs)
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "pending")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(10)

      if (error) {
        return Response.json({ error: "Failed to fetch tasks" }, { status: 500 })
      }
      tasks = data || []
    }

    const results = []

    for (const task of tasks) {
      const employee = AI_EMPLOYEES.find(e => e.id === task.ai_employee_id)
      
      if (!employee) {
        await supabase
          .from("tasks")
          .update({ status: "failed", error_message: "AI employee not found" })
          .eq("id", task.id)
        results.push({ task_id: task.id, status: "failed", error: "AI employee not found" })
        continue
      }

      try {
        // Update to processing
        await supabase
          .from("tasks")
          .update({ status: "processing", started_at: new Date().toISOString() })
          .eq("id", task.id)

        // Generate AI response
        const { text, usage } = await generateText({
          model: "openai/gpt-4o-mini",
          system: employee.systemPrompt,
          prompt: task.prompt
        })

        // Update with result
        await supabase
          .from("tasks")
          .update({
            status: "completed",
            result: text,
            tokens_used: usage?.totalTokens || 0,
            completed_at: new Date().toISOString()
          })
          .eq("id", task.id)

        // Update user's task count
        await supabase.rpc("increment_tasks_used", { user_id: task.user_id })

        // Log the task
        await supabase
          .from("task_logs")
          .insert({
            user_id: task.user_id,
            ai_employee_id: task.ai_employee_id,
            task_type: employee.role,
            description: task.title,
            tokens_used: usage?.totalTokens || 0,
            status: "completed"
          })

        results.push({ task_id: task.id, status: "completed", tokens_used: usage?.totalTokens })

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        
        await supabase
          .from("tasks")
          .update({
            status: "failed",
            error_message: errorMessage,
            completed_at: new Date().toISOString()
          })
          .eq("id", task.id)

        results.push({ task_id: task.id, status: "failed", error: errorMessage })
      }
    }

    return Response.json({ processed: results.length, results })

  } catch (error) {
    console.error("Task processor error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET endpoint to check pending tasks count
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { count } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")

    return Response.json({ pending_tasks: count || 0 })
  } catch {
    return Response.json({ error: "Failed to fetch task count" }, { status: 500 })
  }
}
