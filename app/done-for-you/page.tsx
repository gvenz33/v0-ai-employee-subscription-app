import Link from "next/link"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { CustomBuildFaq } from "@/components/landing/custom-build-faq"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, Hammer, Mail } from "lucide-react"

const bookCallHref = process.env.NEXT_PUBLIC_BOOK_CALL_URL ?? "/contact"

const deliverables = [
  "Fast-response system: reply in minutes with AI-drafted responses (optional approval while we tune your voice)",
  "Follow-up sequences: persistent, on-brand follow-ups so leads don’t go cold",
  "Lead pipeline: simple stages + tags so every inquiry has a next step",
  "Templates + guardrails: what we say, what we never say, and when to hand off to a human",
  "Weekly optimization: short report + improvements based on real conversations",
]

const processSteps = [
  { title: "Fit call (15 min)", detail: "We confirm your offer, target customer, and what a ‘qualified lead’ looks like. If it’s not a fit, we’ll tell you fast." },
  { title: "48-hour setup", detail: "We build your first-response + follow-up system and align it to your tone, rules, and handoff path." },
  { title: "Launch + tune", detail: "We monitor early conversations, tighten the scripts, and improve conversion over the first 1–2 weeks." },
  { title: "Scale", detail: "Once it’s working, we can connect more sources (forms/ads/CRM) and add routing, reporting, and automation." },
]

const guarantees = [
  {
    title: "No overpromising",
    body: "We start with AI-drafted replies and follow-ups. You can require approval until you trust the system.",
  },
  {
    title: "Fast time-to-value",
    body: "Your initial setup goes live in 48 hours after we collect your basics (offer, FAQs, and voice examples).",
  },
  {
    title: "Cancel anytime",
    body: "If you don’t want ongoing tuning, you can stop after the setup—no long contracts.",
  },
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
              <span>Done-for-you lead follow-up</span>
            </div>
            <h1 className="font-display text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Done-for-you lead follow-up that replies in minutes
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              We install a simple, reliable system that responds fast, follows up consistently, and keeps leads moving
              until they book. We start with AI-drafted replies (optionally human-approved) so you never overpromise—and
              you still sound like you.
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

            <div className="mx-auto mt-12 grid max-w-4xl gap-6 text-left md:grid-cols-3">
              {guarantees.map((item) => (
                <div key={item.title} className="rounded-2xl border border-border/50 bg-card p-6">
                  <h3 className="font-display text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
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
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Two ways to get it done</h2>
            <p className="mt-4 text-muted-foreground">
              Start simple and safe (AI drafts + optional approval). Then automate more as we learn what converts.
            </p>
            <div className="mt-10 grid gap-6 text-left sm:grid-cols-2">
              <div className="rounded-2xl border border-border/50 bg-card p-6">
                <h3 className="font-display font-semibold text-foreground">Setup only (48 hours)</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  We install the initial lead follow-up system: first reply, follow-ups, handoff rules, and reporting.
                  You can run it with optional approval while it learns your tone.
                </p>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
                <h3 className="font-display font-semibold text-foreground">Setup + ongoing optimization</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  We monitor conversations, improve conversion, add routing/automation, and expand to more lead sources
                  (forms, ads, CRM) as you scale.
                </p>
              </div>
            </div>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href={bookCallHref}>Book a setup call</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/#pricing">Prefer DIY? Start free trial</Link>
              </Button>
            </div>
          </div>
        </section>

        <CustomBuildFaq />
      </main>
      <Footer />
    </div>
  )
}
