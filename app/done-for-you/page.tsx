import Link from "next/link"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, Hammer, Mail } from "lucide-react"

const bookCallHref = process.env.NEXT_PUBLIC_BOOK_CALL_URL ?? "/contact"

const deliverables = [
  "Discovery and workflow mapping aligned to how your team actually works",
  "Custom agent stack and prompts tuned to your offers, tone, and guardrails",
  "Integrations with the tools you already use (CRM, inbox, scheduling, and more)",
  "Onboarding for your operators plus documentation so knowledge stays in the business",
  "Ongoing maintenance, monitoring, and iteration as your process evolves",
]

const processSteps = [
  { title: "Fit call", detail: "We confirm scope, stakeholders, and success criteria—typically businesses with $1M+ annual revenue or equivalent operational load." },
  { title: "Design", detail: "We map workflows, handoffs, and failure modes, then propose the agent stack and rollout plan." },
  { title: "Build & train", detail: "We configure agents, test edge cases, and align outputs with your brand and compliance needs." },
  { title: "Launch & handoff", detail: "We go live with your team, refine based on real usage, and set up a cadence for improvements." },
]

export default function DoneForYouPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <section className="border-b border-border/50 px-6 py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
              <Hammer className="h-4 w-4" />
              <span>Done-for-you implementation</span>
            </div>
            <h1 className="font-display text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              We build and run your AI back office with you
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              For serious operators who want a custom agent stack, workflow design, onboarding, and ongoing
              maintenance—not another tool to figure out alone. Typical fit: roughly{" "}
              <strong className="font-medium text-foreground">$1M+ annual revenue</strong> or teams with heavy inbound
              volume and process complexity.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="gap-2 px-8" asChild>
                <Link href={bookCallHref}>
                  Book a discovery call
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 px-8" asChild>
                <a href="mailto:hello@247aiemployees.net?subject=Done-for-you%20inquiry">
                  <Mail className="h-4 w-4" />
                  Email us
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-display text-2xl font-bold text-foreground sm:text-3xl">What you get</h2>
            <ul className="mx-auto mt-10 max-w-2xl space-y-4">
              {deliverables.map((line) => (
                <li key={line} className="flex gap-3 text-muted-foreground">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="leading-relaxed">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-y border-border/50 bg-muted/30 px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-display text-2xl font-bold text-foreground sm:text-3xl">How it works</h2>
            <ol className="mx-auto mt-12 grid gap-8 md:grid-cols-2">
              {processSteps.map((step, i) => (
                <li key={step.title} className="rounded-2xl border border-border/50 bg-card p-6">
                  <span className="text-sm font-semibold text-primary">Step {i + 1}</span>
                  <h3 className="mt-2 font-display text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Investment (indicative ranges)</h2>
            <p className="mt-4 text-muted-foreground">
              Final quotes depend on scope, systems, and compliance needs. We will spell everything out before kickoff.
            </p>
            <div className="mt-10 grid gap-6 text-left sm:grid-cols-2">
              <div className="rounded-2xl border border-border/50 bg-card p-6">
                <h3 className="font-display font-semibold text-foreground">Done-with-you</h3>
                <p className="mt-2 text-sm text-muted-foreground">We co-build with your team; you operate day to day.</p>
                <p className="mt-4 text-2xl font-bold text-foreground">$500–$2,500</p>
                <p className="text-sm text-muted-foreground">setup (typical range)</p>
                <p className="mt-2 text-lg font-semibold text-foreground">$99–$499/mo</p>
                <p className="text-sm text-muted-foreground">ongoing light support</p>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
                <h3 className="font-display font-semibold text-foreground">Done-for-you</h3>
                <p className="mt-2 text-sm text-muted-foreground">We implement, tune, and maintain the full stack.</p>
                <p className="mt-4 text-2xl font-bold text-foreground">$5k–$10k</p>
                <p className="text-sm text-muted-foreground">setup (typical range)</p>
                <p className="mt-2 text-lg font-semibold text-foreground">$500–$3k/mo</p>
                <p className="text-sm text-muted-foreground">ongoing maintenance &amp; iteration</p>
              </div>
            </div>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href={bookCallHref}>Book a discovery call</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/#pricing">Compare self-serve plans</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t border-border/50 px-6 py-16">
          <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-8">
            <h2 className="font-display text-xl font-semibold text-foreground">Done-for-you FAQ</h2>
            <dl className="mt-6 space-y-6 text-sm text-muted-foreground">
              <div>
                <dt className="font-medium text-foreground">Is this the same product as self-serve?</dt>
                <dd className="mt-1 leading-relaxed">
                  Yes—the same automation engine and AI Employees power both tracks. Done-for-you is packaging plus
                  implementation and ongoing care.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Do I need $1M revenue exactly?</dt>
                <dd className="mt-1 leading-relaxed">
                  No. It is a rule of thumb for fit: high enough volume that custom workflows and maintenance pay off. If
                  you are unsure, book a call and we will tell you honestly.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Can we start with done-with-you and upgrade?</dt>
                <dd className="mt-1 leading-relaxed">
                  Often yes. Many teams begin with a focused build, then add retained maintenance as usage grows.
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
