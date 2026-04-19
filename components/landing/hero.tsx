import Image from "next/image"
import { Users, Zap, Clock } from "lucide-react"
import { PathChoice } from "@/components/landing/path-choice"

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
          <Clock className="h-4 w-4" />
          <span>Your small-business AI back office</span>
        </div>

        <h1 className="font-display text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          Save time. Cut chaos.{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Follow up faster
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          One platform for admin help, lead handling, inbox cleanup, content support, simple SOPs, reminders, and
          lightweight reporting—without hiring a bigger team.
        </p>

        <PathChoice />

        <p className="mt-10 text-sm text-muted-foreground">
          Want the full roster first?{" "}
          <a href="/#agents" className="font-medium text-primary underline-offset-4 hover:underline">
            Browse all AI Employees
          </a>{" "}
          or{" "}
          <a href="/#pricing" className="font-medium text-primary underline-offset-4 hover:underline">
            see self-serve pricing
          </a>
          .
        </p>

        <div className="mx-auto mt-16 grid max-w-xl grid-cols-3 gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">Hours back</span>
            <span className="text-sm text-muted-foreground">Every week</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">Leads &amp; follow-up</span>
            <span className="text-sm text-muted-foreground">Less slipping through</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">30+ roles</span>
            <span className="text-sm text-muted-foreground">Ready to deploy</span>
          </div>
        </div>
      </div>
    </section>
  )
}
