import Link from "next/link"
import { ArrowRight, Clock, MessageSquare, CalendarCheck2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const steps = [
  {
    icon: MessageSquare,
    title: "1) Capture the lead",
    description: "Forward your contact form + inbox replies into one place so every inquiry is tracked.",
  },
  {
    icon: Clock,
    title: "2) Reply + follow up automatically",
    description: "Send fast first responses and smart follow-ups that sound human so momentum never dies.",
  },
  {
    icon: CalendarCheck2,
    title: "3) Turn replies into booked calls",
    description: "Keep conversations moving until they bookor you explicitly mark them as lost.",
  },
] as const

export function HowItWorks() {
  return (
    <section id="how" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-balance text-3xl font-bold text-foreground sm:text-4xl">How it works</h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            A simple system that keeps follow-ups consistent, fast, and on-brand.
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
