"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Settings, 
  CreditCard,
  Bot,
  Share2,
  Shield,
  BookOpen
} from "lucide-react"

interface AdminSidebarProps {
  isSuperAdmin: boolean
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/support", label: "Support Chats", icon: MessageSquare },
  { href: "/admin/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/admin/affiliates", label: "Affiliates", icon: Share2 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function AdminSidebar({ isSuperAdmin }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-border bg-card hidden lg:flex flex-col">
      <div className="p-6 border-b border-border">
        <Link href="/admin" className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="247 AI Employees"
            width={40}
            height={40}
            className="h-10 w-auto"
          />
          <div>
            <span className="text-sm font-display font-bold text-foreground block">Admin Console</span>
            {isSuperAdmin && (
              <span className="text-xs text-primary flex items-center gap-1">
                <Shield className="h-3 w-3" /> Super Admin
              </span>
            )}
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/admin" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Back to Dashboard
        </Link>
      </div>
    </aside>
  )
}
