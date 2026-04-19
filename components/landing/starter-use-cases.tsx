import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Inbox, Megaphone, MessageSquare } from "lucide-react"

const cases = [
  {
    icon: MessageSquare,
    title: "Lead follow-up",
    bullets: ["Respond faster to inquiries", "Draft follow-ups that sound human", "Keep momentum on warm leads"],
  },
  {
    icon: Megaphone,
    title: "Content repurposing",
    bullets: ["Turn one recording into posts and emails", "Adapt tone for each channel", "Ship more without starting from zero"],
  },
  {
    icon: Inbox,
    title: "Inbox + task triage",
    bullets: ["Sort what matters first", "Turn threads into clear next steps", "Pair with your task queue for execution"],
  },
] as const

export function StarterUseCases() {
  return (
    <section id="starter" className="scroll-mt-24 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-balance text-3xl font-bold text-foreground sm:text-4xl">
            Three simple places to start
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Clear outcomes, no jargon. Pick one, try it on a real workflow this week.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {cases.map(({ icon: Icon, title, bullets }) => (
            <div
              key={title}
              className="flex flex-col rounded-2xl border border-border/50 bg-card p-6 text-left shadow-sm transition-colors hover:border-primary/30"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                {bullets.map((line) => (
                  <li key={line} className="leading-relaxed">
                    {line}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button className="w-full sm:flex-1" asChild>
                  <Link href="/auth/sign-up">Start free trial</Link>
                </Button>
                <Button variant="outline" className="w-full sm:flex-1" asChild>
                  <a href="/#agents">See matching AI Employees</a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
