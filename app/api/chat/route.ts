import { streamText, convertToModelMessages } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { AI_EMPLOYEES } from '@/lib/products'

export async function POST(req: Request) {
  const { messages, employeeId } = await req.json()
  
  // Get the AI employee configuration
  const employee = AI_EMPLOYEES.find(e => e.id === employeeId)
  
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

  // Check if user has access to this employee based on tier
  const tierHierarchy = { free: 0, pro: 1, enterprise: 2 }
  const userTierLevel = tierHierarchy[profile.subscription_tier as keyof typeof tierHierarchy] || 0
  const requiredTierLevel = tierHierarchy[employee.tierRequired as keyof typeof tierHierarchy] || 0
  
  if (userTierLevel < requiredTierLevel) {
    return new Response(`This AI employee requires ${employee.tierRequired} tier`, { status: 403 })
  }

  // Check task limits
  if (profile.tasks_used >= profile.tasks_limit) {
    return new Response('Task limit reached. Please upgrade your plan.', { status: 429 })
  }

  // Build the system prompt based on the employee's personality
  const systemPrompt = `You are ${employee.name}, an AI ${employee.role}. ${employee.description}
  
Your capabilities include: ${employee.capabilities.join(', ')}.

Always respond in character as ${employee.name}. Be helpful, professional, and focused on your area of expertise.
When asked about tasks outside your expertise, politely redirect the user to the appropriate AI employee.`

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
