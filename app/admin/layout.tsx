import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin/sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is superadmin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin, is_admin")
    .eq("id", user.id)
    .single()

  if (!profile?.is_superadmin && !profile?.is_admin) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar isSuperAdmin={profile.is_superadmin} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
