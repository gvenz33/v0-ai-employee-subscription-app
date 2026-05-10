import Link from "next/link"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { CustomBuildFaq } from "@/components/landing/custom-build-faq"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, Hammer, Mail } from "lucide-react"

const bookCallHref = process.env.NEXT_PUBLIC_BOOK_CALL_URL ?? "https://calendar.app.google/4VNLx1krhteqwXJB8"

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
              <span>Agency reseller program</span>
            </div>
            <h1 className="font-display text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              White-label AI lead follow-up you can sell to clients
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Stop losing leads your clients already paid for. We install fast-response + follow-up systems that reply in
              minutes, stay on-brand, and keep prospects moving until they book—starting with AI drafts and optional
              approval so you never overpromise.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="gap-2 px-8" asChild>
                <Link href={bookCallHref}>
                  Book a reseller call
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 px-8" asChild>
                <a href="mailto:hello@247aiemployees.net?subject=Agency%20reseller%20inquiry">
                  <Mail className="h-4 w-4" />
                  Email us
                </a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              You keep the client relationship. You set your pricing. We deliver the system.
            </p>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-display text-2xl font-bold text-foreground sm:text-3xl">
              What your clients get (and you deliver)
            </h2>
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

            <div className="mx-auto mt-12 max-w-4xl rounded-2xl border border-primary/20 bg-primary/5 p-8">
              <h3 className="font-display text-xl font-semibold text-foreground">Your margin</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                We charge the agency. You set the client price. Most agencies position this as a “lead response + follow
                up system” and mark it up as a setup fee plus monthly management.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-card p-5">
                  <p className="text-sm font-semibold text-foreground">Suggested client price</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">$1.5k–$3k</p>
                  <p className="mt-1 text-sm text-muted-foreground">setup (one-time)</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-5">
                  <p className="text-sm font-semibold text-foreground">Suggested monthly</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">$500–$1k</p>
                  <p className="mt-1 text-sm text-muted-foreground">per client</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-5">
                  <p className="text-sm font-semibold text-foreground">What you sell</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">Speed + follow-up</p>
                  <p className="mt-1 text-sm text-muted-foreground">from existing leads</p>
                </div>
              </div>
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
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Reseller packages</h2>
            <p className="mt-4 text-muted-foreground">
              Start with 1–3 clients, then scale as you standardize your onboarding.
            </p>

            <div className="mt-10 grid gap-6 text-left sm:grid-cols-2">
              <div className="rounded-2xl border border-border/50 bg-card p-6">
                <h3 className="font-display text-lg font-semibold text-foreground">Reseller Starter</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Perfect for agencies installing this for their first few clients. We help you deliver the system quickly
                  and safely.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>• 48-hour setup per client</li>
                  <li>• AI drafts + optional approval</li>
                  <li>• Follow-up sequences + handoff rules</li>
                  <li>• 2 weeks of tuning</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
                <h3 className="font-display text-lg font-semibold text-foreground">Reseller Scale</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Best once you’re onboarding 5+ clients and want more standardization, reporting, and faster delivery.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>• Faster onboarding playbook</li>
                  <li>• Monthly performance report per client</li>
                  <li>• Priority support</li>
                  <li>• Add lead sources (forms/ads/CRM) as you grow</li>
                </ul>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href={bookCallHref}>Book a reseller call</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/#pricing">Not an agency? Start free trial</Link>
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
