"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const faqs: { question: string; answer: ReactNode }[] = [
  {
    question: "Is this the same as self-serve?",
    answer:
      "No. Self-serve is built for speed and affordability: ready-made AI Employees, templates, and workflows you adapt yourself—perfect when you want to run lean and experiment. A custom build is different: we architect automations around your real pipelines, approvals, tone, and tools. You get bespoke prompts, integrations, testing, and ongoing tuning—so outputs feel like your business, not a generic assistant. If the stakes are high enough that \"close enough\" costs you deals or time, the custom route is built for that.",
  },
  {
    question: "Why not stay on DIY if the platform is the same?",
    answer:
      "The underlying technology can overlap, but the experience is not. DIY puts configuration and iteration on you. A custom engagement puts senior implementation on us: we shoulder design tradeoffs, edge cases, and handoffs so your team is not stuck becoming accidental automation engineers. You buy back focus and velocity.",
  },
  {
    question: "How long does a custom build usually take?",
    answer:
      "It depends on scope: number of workflows, integrations, reviewers, and how clean your source data is. A focused first wave might be a few weeks; a broader rollout across departments can run longer. We give you a phased plan after discovery so you know milestones, owners, and what \"done\" means for each slice.",
  },
  {
    question: "What tools and systems can you integrate with?",
    answer:
      "We work with the stack you already use—common examples include major CRMs, email and calendar, form tools, scheduling, spreadsheets, and internal APIs. If it has an API, webhooks, or export paths, we can usually tie it in. On the discovery call we map your systems and flag anything that needs a workaround.",
  },
  {
    question: "Who owns the workflows, prompts, and documentation?",
    answer:
      "You do. We deliver playbooks, prompts, and configuration in a form your team can operate and extend. Nothing is hidden behind a black box you cannot audit or hand off. If you ever change vendors or bring work in-house, you are not starting from zero.",
  },
  {
    question: "What does support look like after go-live?",
    answer:
      "We agree on a cadence that matches your risk and volume—check-ins, monitoring, and a clear way to request changes when the business shifts. Fully custom engagements typically include a stronger ongoing loop; co-built setups may be lighter-touch once your team is confident running the system.",
  },
  {
    question: "Do I need $1M revenue exactly?",
    answer:
      "No—it is a rule of thumb for fit. If complexity, volume, or revenue means mistakes are expensive, a custom build often pays for itself. If you are unsure, book a call; we will tell you candidly whether DIY is enough or custom is warranted.",
  },
  {
    question: "Can we start co-built and move to fully custom later?",
    answer:
      "Often yes. Many teams begin with a focused custom rollout, then expand scope or add retained optimization as usage grows. We structure the roadmap so you are not locked in the wrong shape on day one.",
  },
  {
    question: "Is there a minimum team size?",
    answer:
      "No fixed minimum. What matters is whether the work is complex or high-stakes enough that a tailored build saves more than it costs. Solo operators with heavy inbound can still be a fit; large teams with simple needs might be fine on self-serve—we will say so.",
  },
]

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string
  answer: ReactNode
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 py-5 text-left">
        <span className="text-base font-medium text-foreground">{question}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="text-sm text-muted-foreground leading-relaxed [&_a]:text-primary">{answer}</div>
        </div>
      </div>
    </div>
  )
}

export function CustomBuildFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="border-t border-border/50 px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center md:text-left">
          <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">Custom build FAQ</h2>
          <p className="mt-2 text-sm text-muted-foreground">Tap a question to expand the answer.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          {faqs.map((faq, index) => (
            <FAQItem
              key={faq.question}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
