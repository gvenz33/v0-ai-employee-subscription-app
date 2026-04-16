import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Users, Zap } from "lucide-react"

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
          <span>The future of work is here</span>
        </div>

        <h1 className="font-display text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          Hire AI Employees{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            That Actually Work
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Deploy intelligent AI agents that automate sales, marketing, customer
          support, and more. Scale your team without the overhead.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="gap-2 px-8" asChild>
            <Link href="/auth/sign-up">
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="gap-2 px-8" asChild>
            <a href="#agents">View AI Employees</a>
          </Button>
        </div>

        <div className="mx-auto mt-16 grid max-w-xl grid-cols-3 gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">30+</span>
            <span className="text-sm text-muted-foreground">AI Employees</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">10x</span>
            <span className="text-sm text-muted-foreground">Faster Output</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">24/7</span>
            <span className="text-sm text-muted-foreground">Always On</span>
          </div>
        </div>
      </div>
    </section>
  )
}
