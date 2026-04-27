import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { getEffectiveWhiteLabelSettings } from "@/lib/white-label"

export const metadata: Metadata = {
  title: "Dashboard · 247 AI Employees",
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()
  const whiteLabel = await getEffectiveWhiteLabelSettings(supabase, user.id)

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar
        isAdmin={profile?.is_superadmin || profile?.is_admin}
        whiteLabel={whiteLabel}
      />
      <div className="flex-1 flex flex-col">
        <DashboardHeader user={user} profile={profile} whiteLabel={whiteLabel} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
