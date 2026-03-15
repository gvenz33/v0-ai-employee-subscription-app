import { createClient } from "@/lib/supabase/server"
import { AI_EMPLOYEES, SUBSCRIPTION_PLANS } from "@/lib/products"
import { EmployeeCard } from "@/components/dashboard/employee-card"

export default async function EmployeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single()

  const { data: userEmployees } = await supabase
    .from("ai_employees")
    .select("*")
    .eq("user_id", user?.id)

  const tier = profile?.subscription_tier || "free"
  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.tier === tier) || SUBSCRIPTION_PLANS[0]

  // Get tier priority for comparison
  const tierPriority: Record<string, number> = { free: 0, pro: 1, enterprise: 2 }
  const userTierLevel = tierPriority[tier] || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">AI Employees</h1>
        <p className="text-muted-foreground">
          Manage your AI workforce. Your {currentPlan.name} plan gives you access to {currentPlan.features[0].toLowerCase()}.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {AI_EMPLOYEES.map((employee) => {
          const userEmployee = userEmployees?.find(e => e.name === employee.name)
          const requiredTierLevel = tierPriority[employee.tierRequired] || 0
          const isLocked = userTierLevel < requiredTierLevel

          return (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              userEmployee={userEmployee}
              isLocked={isLocked}
              userId={user?.id || ""}
            />
          )
        })}
      </div>
    </div>
  )
}
