import { streamText, convertToModelMessages } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { AI_EMPLOYEES, canAccessEmployee, getEmployeeById } from '@/lib/products'

export async function POST(req: Request) {
  const { messages, employeeId } = await req.json()
  
  // Get the AI employee configuration
  const employee = getEmployeeById(employeeId)
  
  if (!employee) {
    return new Response('AI Employee not found', { status: 404 })
  }

  // Check user authentication and subscription
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Get user profile to check subscription tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, tasks_used, tasks_limit')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return new Response('Profile not found', { status: 404 })
  }

  const userTier = profile.subscription_tier || 'personal'
  
  // Check if user has access to this employee based on tier
  if (!canAccessEmployee(userTier, employee.tier_required)) {
    return new Response(`This AI employee requires ${employee.tier_required} tier`, { status: 403 })
  }

  // Check task limits
  if (profile.tasks_used >= profile.tasks_limit) {
    return new Response('Task limit reached. Please upgrade your plan or purchase more tasks.', { status: 429 })
  }

  // Use the employee's system prompt directly
  const systemPrompt = employee.systemPrompt

  const result = streamText({
    model: 'openai/gpt-4o-mini',
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    onFinish: async () => {
      // Log the task and increment usage
      await supabase.from('task_logs').insert({
        user_id: user.id,
        ai_employee_id: employeeId,
        task_type: 'chat',
        description: `Chat with ${employee.name}`,
        tokens_used: 1
      })

      // Increment tasks used
      await supabase
        .from('profiles')
        .update({ tasks_used: profile.tasks_used + 1 })
        .eq('id', user.id)
    }
  })

  return result.toUIMessageStreamResponse()
}
