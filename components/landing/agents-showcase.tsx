"use client"

import { useState } from "react"
import { AI_EMPLOYEE_CATALOG, AI_EMPLOYEE_COUNT } from "@/lib/products"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  TrendingUp, PenTool, BarChart3, Headphones, Search, Share2,
  Mail, Code, DollarSign, Users, Clipboard, Shield, Microscope, Code2,
} from "lucide-react"

const iconMap: Record<string, React.ElementType> = {
  TrendingUp, PenTool, BarChart3, Headphones, Search, Share2,
  Mail, Code, DollarSign, Users, Clipboard, Shield, Microscope, Code2,
}

const tierColors: Record<string, string> = {
  free: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pro: "bg-primary/10 text-primary border-primary/20",
  enterprise: "bg-accent/10 text-accent border-accent/20",
}

const tierLabels: Record<string, string> = {
  free: "Starter",
  pro: "Professional",
  enterprise: "Enterprise",
}

const FEATURED_COUNT = 8

export function AgentsShowcase() {
  const [showAll, setShowAll] = useState(false)
  const visibleAgents = showAll ? AI_EMPLOYEE_CATALOG : AI_EMPLOYEE_CATALOG.slice(0, FEATURED_COUNT)

  return (
    <section id="agents" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-balance text-3xl font-bold text-foreground sm:text-4xl">
            Meet your AI workforce
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Start with one workflow, then scale with {AI_EMPLOYEE_COUNT} specialists across sales, ops, content, and
            more—each trained on role-specific best practices.
          </p>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleAgents.map((agent) => {
            const Icon = iconMap[agent.icon] || BarChart3
            return (
              <div
                key={agent.name}
                className="group flex flex-col rounded-xl border border-border/50 bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${tierColors[agent.tier_required]}`}
                  >
                    {tierLabels[agent.tier_required]}
                  </Badge>
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                  {agent.name}
                </h3>
                <p className="mt-0.5 text-xs font-medium text-primary">
                  {agent.role}
                </p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {agent.description}
                </p>
              </div>
            )
          })}
        </div>

        {!showAll && AI_EMPLOYEE_CATALOG.length > FEATURED_COUNT && (
          <div className="mt-10 flex justify-center">
            <Button variant="outline" onClick={() => setShowAll(true)}>
              View all {AI_EMPLOYEE_COUNT} AI Employees
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
