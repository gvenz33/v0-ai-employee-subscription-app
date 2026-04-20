import { streamText, convertToModelMessages } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { getEmployeeById, hasAccessToEmployee } from '@/lib/products'
import { validateApiKey, logApiRequest } from '@/lib/api-auth'

export async function POST(req: Request) {
  const startTime = Date.now()
  const { messages, employeeId } = await req.json()
  
  // Get the AI employee configuration
  const employee = getEmployeeById(employeeId)
  
  if (!employee) {
    return new Response('AI Employee not found', { status: 404 })
  }

  // Try API key auth first, then fall back to session auth
  let userId: string | null = null
  let apiKeyId: string | null = null
  
  const authHeader = req.headers.get('Authorization')
  
  if (authHeader?.startsWith('Bearer 247ai_')) {
    // API key authentication
    const auth = await validateApiKey(req)
    
    if (!auth.valid || !auth.data) {
      await logApiRequest(null, null, '/api/chat', 'POST', 401, Date.now() - startTime, req)
      return new Response(auth.error || 'Invalid API key', { status: 401 })
    }
    
    if (!auth.data.permissions.chat) {
      await logApiRequest(auth.data.id, auth.data.user_id, '/api/chat', 'POST', 403, Date.now() - startTime, req)
      return new Response('API key does not have chat permission', { status: 403 })
    }
    
    userId = auth.data.user_id
    apiKeyId = auth.data.id
  } else {
    // Session-based authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }
    
    userId = user.id
  }

  const supabase = await createClient()

  // Get user profile to check subscription tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, tasks_used, tasks_limit')
    .eq('id', userId)
    .single()

  if (!profile) {
    if (apiKeyId) await logApiRequest(apiKeyId, userId, '/api/chat', 'POST', 404, Date.now() - startTime, req)
    return new Response('Profile not found', { status: 404 })
  }

  const userTier = profile.subscription_tier || 'personal'

  const { data: alaSubs } = await supabase
    .from('a_la_carte_subscriptions')
    .select('employee_id')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])

  const alaUnlocked = alaSubs?.map((r) => r.employee_id) ?? []

  if (!hasAccessToEmployee(userTier, employee, alaUnlocked)) {
    if (apiKeyId) await logApiRequest(apiKeyId, userId, '/api/chat', 'POST', 403, Date.now() - startTime, req)
    return new Response(
      `This AI employee requires a higher plan or an à la carte subscription`,
      { status: 403 },
    )
  }

  // Check task limits
  if (profile.tasks_used >= profile.tasks_limit) {
    if (apiKeyId) await logApiRequest(apiKeyId, userId, '/api/chat', 'POST', 429, Date.now() - startTime, req)
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
        user_id: userId,
        ai_employee_id: employeeId,
        task_type: 'chat',
        description: `Chat with ${employee.name}`,
        tokens_used: 1
      })

      // Increment tasks used
      await supabase
        .from('profiles')
        .update({ tasks_used: profile.tasks_used + 1 })
        .eq('id', userId)
        
      // Log API request if using API key
      if (apiKeyId) {
        await logApiRequest(apiKeyId, userId, '/api/chat', 'POST', 200, Date.now() - startTime, req)
      }
    }
  })

  return result.toUIMessageStreamResponse()
}
