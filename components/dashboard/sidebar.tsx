"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, CreditCard, BarChart3, FileText, Settings, ListTodo, Share2, Shield, Code } from "lucide-react"

interface DashboardSidebarProps {
  isAdmin?: boolean
}

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/employees", label: "AI Employees", icon: Users },
  { href: "/dashboard/tasks", label: "Task Queue", icon: ListTodo },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/affiliate", label: "Affiliate", icon: Share2 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
  { href: "/dashboard/api-docs", label: "API Docs", icon: Code },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function DashboardSidebar({ isAdmin = false }: DashboardSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-border bg-card hidden lg:flex flex-col">
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="247 AI Employees"
            width={40}
            height={40}
            className="h-10 w-auto"
          />
          <span className="text-sm font-display font-bold text-foreground leading-tight">247ai<br/>employees</span>
        </Link>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/dashboard" && pathname.startsWith(item.href))
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Admin Link */}
        {isAdmin && (
          <div className="mt-6 pt-6 border-t border-border">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Administration
            </p>
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-yellow-500/20 text-yellow-500"
                  : "text-yellow-500/80 hover:text-yellow-500 hover:bg-yellow-500/10"
              )}
            >
              <Shield className="h-5 w-5" />
              Admin Console
            </Link>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm font-medium text-foreground">Need help?</p>
          <p className="text-xs text-muted-foreground mt-1">
            Check our docs or contact support
          </p>
          <Link 
            href="/contact" 
            className="text-xs text-primary hover:underline mt-2 inline-block"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </aside>
  )
}
