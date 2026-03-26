import { createClient } from "@/lib/supabase/server"
import { AI_EMPLOYEES, DEPARTMENTS, canAccessEmployee, getPlanById, type Department } from "@/lib/products"
import { EmployeeCard } from "@/components/dashboard/employee-card"
import { Heart, TrendingUp, Briefcase, Scale, Palette, Crown } from "lucide-react"

const departmentIcons: Record<Department, React.ReactNode> = {
  "personal-life": <Heart className="h-5 w-5" />,
  "marketing-growth": <TrendingUp className="h-5 w-5" />,
  "business-operations": <Briefcase className="h-5 w-5" />,
  "finance-legal": <Scale className="h-5 w-5" />,
  "creative-technical": <Palette className="h-5 w-5" />,
  "premium": <Crown className="h-5 w-5" />,
}

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

  const tier = profile?.subscription_tier || "personal"
  const currentPlan = getPlanById(tier)

  // Group employees by department
  const employeesByDepartment = DEPARTMENTS.map(dept => ({
    ...dept,
    employees: AI_EMPLOYEES.filter(emp => emp.department === dept.id)
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Your AI Team</h1>
        <p className="text-muted-foreground">
          {currentPlan ? (
            <>Your {currentPlan.name} plan includes {currentPlan.limits.aiEmployees} AI employees.</>
          ) : (
            <>Upgrade your plan to unlock more AI employees.</>
          )}
        </p>
      </div>

      {employeesByDepartment.map((department) => (
        <div key={department.id} className="space-y-4">
          <div className="flex items-center gap-3 border-b border-border pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {departmentIcons[department.id]}
            </div>
            <div>
              <h2 className="font-display font-semibold text-foreground">{department.name}</h2>
              <p className="text-sm text-muted-foreground">{department.description}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {department.employees.map((employee) => {
              const userEmployee = userEmployees?.find(e => e.name === employee.name)
              const isLocked = !canAccessEmployee(tier, employee.tier_required)

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
      ))}
    </div>
  )
}
