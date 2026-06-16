import Image from "next/image"
import { Bot, Clock, Sparkles } from "lucide-react"
import { PathChoice } from "@/components/landing/path-choice"
import { AI_EMPLOYEE_COUNT } from "@/lib/products"

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 py-24 lg:py-32">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-8 flex justify-center">
          <Image
            src="/images/logo-transparent.png"
            alt="247 AI Employees"
            width={600}
            height={600}
            className="h-64 w-auto sm:h-80 md:h-96 lg:h-[28rem]"
            priority
          />
        </div>

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
          <Sparkles className="h-4 w-4" />
          <span>Your lean AI back office</span>
        </div>

        <h1 className="font-display text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          AI Employees that handle the work{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            you keep putting off.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Start with lead follow-up, inbox triage, or content—then add more agents as you grow. Templates, task queue,
          and automations included.
        </p>

        <PathChoice />

        <p className="mt-10 text-sm text-muted-foreground">
          <a href="/#agents" className="font-medium text-primary underline-offset-4 hover:underline">
            See all {AI_EMPLOYEE_COUNT} AI Employees
          </a>{" "}
          ·{" "}
          <a href="/#pricing" className="font-medium text-primary underline-offset-4 hover:underline">
            Compare plans
          </a>
        </p>

        <div className="mx-auto mt-16 grid max-w-xl grid-cols-3 gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">24/7 execution</span>
            <span className="text-sm text-muted-foreground">Tasks run in the background</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">{AI_EMPLOYEE_COUNT} specialists</span>
            <span className="text-sm text-muted-foreground">Sales, ops, content, and more</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">Start in minutes</span>
            <span className="text-sm text-muted-foreground">Templates, not blank slates</span>
          </div>
        </div>
      </div>
    </section>
  )
}
