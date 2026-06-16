import Link from "next/link"
import { ArrowRight, Bot, Sparkles, Workflow } from "lucide-react"
import { Button } from "@/components/ui/button"

const steps = [
  {
    icon: Sparkles,
    title: "1) Pick a starter",
    description:
      "Lead follow-up, inbox triage, or content repurposing—choose one concrete workflow to launch this week.",
  },
  {
    icon: Bot,
    title: "2) Deploy an AI Employee",
    description: "Use templates to get moving fast, then tune tone, rules, and handoffs in minutes.",
  },
  {
    icon: Workflow,
    title: "3) Run it on autopilot",
    description: "Task queue, webhooks, and scheduled runs keep work moving while you focus on higher-leverage tasks.",
  },
] as const

export function HowItWorks() {
  return (
    <section id="how" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-balance text-3xl font-bold text-foreground sm:text-4xl">
            How your first workflow runs
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            A simple path from starter template to background execution—no engineering team required.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.title} className="rounded-2xl border border-border/50 bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button className="gap-2" asChild>
            <Link href="/auth/sign-up">
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
