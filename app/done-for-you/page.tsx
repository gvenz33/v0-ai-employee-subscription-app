import Link from "next/link"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { CustomBuildFaq } from "@/components/landing/custom-build-faq"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, Hammer, Mail } from "lucide-react"

const bookCallHref = process.env.NEXT_PUBLIC_BOOK_CALL_URL ?? "/contact"

const deliverables = [
  "Bespoke discovery: we map how work really flows—not how the slide deck says it should",
  "Custom-built agent stack, prompts, and guardrails matched to your offers and brand voice",
  "Deep integrations with the tools you already rely on (CRM, inbox, scheduling, and more)",
  "Hands-on onboarding plus documentation so your team owns the system, not a black box",
  "Ongoing tuning, monitoring, and iteration as volume, seasons, and offers change",
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
              <span>Custom-built for how you actually work</span>
            </div>
            <h1 className="font-display text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              A fully custom AI back office—not a template
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              We design, build, and refine automations around your pipelines, your voice, and your stack—so you get
              outcomes that match your business, not a generic checklist. Typical fit: serious operators with roughly{" "}
              <strong className="font-medium text-foreground">$1M+ annual revenue</strong> or heavy inbound volume where
              off-the-shelf setups leave money on the table.
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
            <h2 className="text-center font-display text-2xl font-bold text-foreground sm:text-3xl">
              What a custom build includes
            </h2>
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
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Two ways to go custom</h2>
            <p className="mt-4 text-muted-foreground">
              Every engagement is quoted to your scope—integrations, compliance, and how hands-on you want us. On a call
              we&apos;ll recommend the right build and walk through what &quot;done&quot; looks like for you.
            </p>
            <div className="mt-10 grid gap-6 text-left sm:grid-cols-2">
              <div className="rounded-2xl border border-border/50 bg-card p-6">
                <h3 className="font-display font-semibold text-foreground">Co-built (guided custom)</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  We architect and configure a tailored stack together—you stay close to the controls while we handle the
                  heavy lifting: workflow design, prompt engineering, and launch. Ideal when you want a custom build but
                  your team will run day-to-day operations in-house.
                </p>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
                <h3 className="font-display font-semibold text-foreground">Fully custom (white-glove)</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  We own end-to-end implementation: bespoke automations, rigorous testing, brand-true outputs, and an
                  ongoing cadence of maintenance and improvement. Best when throughput, risk, or complexity mean you
                  cannot afford generic templates or DIY trial-and-error.
                </p>
              </div>
            </div>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href={bookCallHref}>Book a discovery call</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/#pricing">Browse self-serve (DIY) plans</Link>
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
