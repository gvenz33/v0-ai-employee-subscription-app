import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEmployeeById, hasAccessToEmployee } from '@/lib/products'
import { EmployeeChatClient } from './employee-chat-client'

export default async function EmployeeChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const employee = getEmployeeById(id)
  if (!employee) {
    redirect('/dashboard/employees')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  const tier = profile?.subscription_tier ?? 'personal'

  const { data: alaSubs } = await supabase
    .from('a_la_carte_subscriptions')
    .select('employee_id')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])

  const unlocked = alaSubs?.map((r) => r.employee_id) ?? []

  if (!hasAccessToEmployee(tier, employee, unlocked)) {
    redirect('/dashboard/employees')
  }

  return <EmployeeChatClient employeeId={id} />
}
