import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin/sidebar"
import { MobileAdminNav } from "@/components/admin/mobile-nav"

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
    <div className="flex h-screen min-h-screen overflow-hidden bg-background">
      <AdminSidebar isSuperAdmin={profile.is_superadmin} />
      <main className="flex-1 overflow-y-auto overscroll-y-contain pb-24 lg:pb-0">
        {children}
      </main>
      <MobileAdminNav />
    </div>
  )
}
