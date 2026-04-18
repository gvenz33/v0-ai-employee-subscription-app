import { createClient } from "@supabase/supabase-js"
import { generateText } from "ai"
import { AI_EMPLOYEES } from "@/lib/products"
import { runDueScheduledAutomations } from "@/lib/run-scheduled-automations"
import { NextResponse } from "next/server"

// This endpoint is called by a cron job to process pending tasks
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/process-tasks", "schedule": "*/5 * * * *" }] }

export const maxDuration = 300 // 5 minutes max for cron

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get pending tasks (oldest first, up to 10)
  const { data: tasks, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(10)

  if (fetchError) {
    console.error("Error fetching tasks:", fetchError)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }

  let processed = 0
  let failed = 0

  for (const task of tasks || []) {
    try {
      // Mark as processing
      await supabase
        .from("tasks")
        .update({ status: "processing", started_at: new Date().toISOString() })
        .eq("id", task.id)

      // Get AI employee config
      const employee = AI_EMPLOYEES.find(e => e.id === task.ai_employee_id)
      const systemPrompt = employee?.systemPrompt || "You are a helpful AI assistant."

      // Process with AI
      const result = await generateText({
        model: "openai/gpt-4o-mini",
        system: systemPrompt,
        prompt: task.prompt,
        maxOutputTokens: 4000,
      })

      // Mark as completed
      await supabase
        .from("tasks")
        .update({
          status: "completed",
          result: result.text,
          tokens_used: result.usage?.totalTokens || 0,
          completed_at: new Date().toISOString(),
        })
        .eq("id", task.id)

      // Increment user's task count
      await supabase.rpc("increment_tasks_used", { p_user_id: task.user_id })

      // Log the task
      await supabase.from("task_logs").insert({
        user_id: task.user_id,
        task_type: task.ai_employee_id,
        description: task.title,
        status: "completed",
        tokens_used: result.usage?.totalTokens || 0,
      })

      processed++
    } catch (error) {
      console.error(`Error processing task ${task.id}:`, error)
      
      // Mark as failed
      await supabase
        .from("tasks")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
          completed_at: new Date().toISOString(),
        })
        .eq("id", task.id)

      failed++
    }
  }

  let scheduled = { processed: 0, failed: 0, skipped: 0 }
  try {
    scheduled = await runDueScheduledAutomations(supabase)
  } catch (e) {
    console.error("Scheduled automations cron error:", e)
  }

  return NextResponse.json({
    message: "Cron run complete",
    tasks: {
      processed,
      failed,
      total: tasks?.length ?? 0,
    },
    scheduled_automations: scheduled,
  })
}
