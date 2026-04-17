import { NextResponse } from "next/server"
import { validateApiKey, logApiRequest } from "@/lib/api-auth"
import { createClient } from "@/lib/supabase/server"
import { PLANS, AI_EMPLOYEES } from "@/lib/products"

export async function GET(request: Request) {
  const startTime = Date.now()
  
  // Validate API key
  const auth = await validateApiKey(request)
  
  if (!auth.valid || !auth.data) {
    await logApiRequest(null, null, "/api/plan", "GET", 401, Date.now() - startTime, request)
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    
    // Get user's profile with subscription info
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", auth.data.user_id)
      .single()

    if (error || !profile) {
      await logApiRequest(auth.data.id, auth.data.user_id, "/api/plan", "GET", 404, Date.now() - startTime, request)
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // Get current plan details
    const currentPlan = PLANS.find(p => p.id === profile.subscription_tier) || PLANS[0]
    
    // Get available AI employees for this tier
    const tierOrder = ["personal", "entrepreneur", "business", "enterprise"]
    const userTierIndex = tierOrder.indexOf(profile.subscription_tier || "personal")
    
    const availableEmployees = AI_EMPLOYEES.filter(emp => {
      const empTierIndex = tierOrder.indexOf(emp.tier)
      return empTierIndex <= userTierIndex
    })

    const response = {
      user_id: auth.data.user_id,
      subscription: {
        tier: profile.subscription_tier || "personal",
        plan_name: currentPlan.name,
        status: profile.stripe_subscription_id ? "active" : "free",
        tasks_used: profile.tasks_used || 0,
        tasks_limit: profile.tasks_limit || 100,
        tasks_remaining: Math.max(0, (profile.tasks_limit || 100) - (profile.tasks_used || 0)),
        billing_cycle: "monthly",
        price_cents: currentPlan.monthlyPriceInCents,
      },
      features: currentPlan.features,
      ai_employees: {
        total_available: availableEmployees.length,
        list: availableEmployees.map(emp => ({
          id: emp.id,
          name: emp.name,
          role: emp.role,
          department: emp.department,
        })),
      },
      limits: {
        tasks_per_month: profile.tasks_limit || 100,
        api_calls_per_minute: profile.subscription_tier === "enterprise" ? 100 : 30,
        concurrent_tasks: profile.subscription_tier === "enterprise" ? 10 : 3,
      },
    }

    await logApiRequest(auth.data.id, auth.data.user_id, "/api/plan", "GET", 200, Date.now() - startTime, request)
    return NextResponse.json(response)
    
  } catch (error) {
    await logApiRequest(auth.data.id, auth.data.user_id, "/api/plan", "GET", 500, Date.now() - startTime, request)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
