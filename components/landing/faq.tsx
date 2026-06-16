"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { AI_EMPLOYEE_COUNT } from "@/lib/products"

const faqs: { question: string; answer: ReactNode }[] = [
  {
    question: "What are AI Employees?",
    answer: (
      <>
        AI Employees are role-specific agents that handle repeatable work in your lean back office—lead follow-up,
        inbox triage, content repurposing, reporting, and more. Each of our {AI_EMPLOYEE_COUNT} specialists is tuned for
        a job (sales, ops, marketing, support, and beyond). You chat with them in the dashboard, queue tasks, or run
        them on autopilot with webhooks and scheduled jobs.
      </>
    ),
  },
  {
    question: "Where should I start?",
    answer: (
      <>
        Most people begin with one of three starter workflows:{" "}
        <a href="/#starter">lead follow-up</a>, inbox + task triage, or content repurposing. Lead follow-up is usually
        the fastest win. Deploy one AI Employee from a template, run it on a real workflow this week, then add more as
        you grow.
      </>
    ),
  },
  {
    question: "How fast can I deploy my first AI Employee?",
    answer:
      "Minutes, not weeks. Pick a starter workflow, choose a matching agent from the catalog, and use built-in templates to set tone and rules. Your task queue, dashboard, and automations are included from day one—no engineering project required.",
  },
  {
    question: "How many AI Employees are available?",
    answer: `The catalog includes ${AI_EMPLOYEE_COUNT} specialists across sales, marketing, operations, finance, creative, and premium domains. Self-serve plans unlock a subset based on tier; you can add individual premium agents à la carte, or get the full roster through the Founders plan (custom pricing).`,
  },
  {
    question: "How secure is my data?",
    answer:
      "Your data is encrypted at rest and in transit (AES-256 and TLS 1.3). We use Supabase with Row Level Security so users only access their own data. Payments run through Stripe (PCI DSS Level 1); we do not store card details on our servers. API access is authenticated and rate-limited. For Founders engagements, we scope retention and access in writing.",
  },
  {
    question: "Can I upgrade or downgrade my plan?",
    answer:
      "Yes. Upgrades take effect immediately—you get more AI Employees and a higher monthly task allowance right away. Downgrades apply at the start of your next billing cycle. Unused tasks do not roll over month to month.",
  },
  {
    question: "What happens if I hit my monthly task limit?",
    answer:
      "You can buy Token Packs in the dashboard: Boost Pack (50 tasks, about $14.99), Power Pack (150 tasks, about $39.99), or Scale Pack (500 tasks, about $99.99). Credits apply immediately and do not expire. You can also upgrade your plan for a higher monthly cap. We notify you at 80% and 100% of usage.",
  },
  {
    question: "Can I unlock one premium agent without upgrading my whole plan?",
    answer:
      "Yes. Personal and Entrepreneur subscribers can add individual premium AI Employees à la carte for $9.99/month each—useful when you only need one specialist (for example Legal Advisor or M&A Specialist) without moving to Business or Founders. Manage add-ons from the AI Employees page in your dashboard.",
  },
  {
    question: "How do webhooks and automation work?",
    answer:
      "Generate an API key in your dashboard, then send tasks to our webhook endpoint from Zapier, Make, or your own apps. Work runs in the background and shows up in your task queue—ideal for inbox triggers, form submissions, scheduled follow-ups, and keeping starter workflows on autopilot.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "New subscribers get a 14-day money-back guarantee. Contact support within the first 14 days for a full refund. After that, you can cancel anytime and keep access through the end of your billing period; we do not refund partial months.",
  },
  {
    question: "Is this for solo operators or teams?",
    answer: (
      <>
        Both. Solo operators use self-serve plans to run a lean back office without hiring. Teams pick a tier that
        matches task volume and how many agents they need. For larger rollouts—custom pricing, integrations, governance,
        and dedicated support—see{" "}
        <a href="/#pricing">Founders (custom pricing)</a> and contact sales.
      </>
    ),
  },
  {
    question: "How does Founders (custom pricing) work?",
    answer:
      "Founders is our consultative tier for teams that need a tailored rollout: integrations, governance, operations visibility, and deeper support. Pricing is quoted from scope and volume—not a fixed public rate. Click Contact Sales on pricing to scope fit, timeline, and outcomes on a call.",
  },
  {
    question: "Can Founders pricing be monthly or yearly?",
    answer:
      "Yes. Founders deals can be quoted monthly, yearly, or both. We can include ramp periods, phased launches, and clear success criteria before production traffic scales up.",
  },
  {
    question: "What is included in Founders beyond higher limits?",
    answer:
      "Founders includes enterprise-grade reliability and support: operations visibility, tenant-level controls, auditability, incident communication, premium onboarding, and access to all premium specialists. Exact deliverables depend on your scope and implementation plan.",
  },
  {
    question: "How quickly can we start after a Founders call?",
    answer:
      "Most teams move quickly once scope is agreed. We usually run a short discovery and setup phase first—integrations, guardrails, and ownership—before ramping production workloads.",
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
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-base font-medium text-foreground pr-4">{question}</span>
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
          <div className="text-muted-foreground leading-relaxed [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline">
            {answer}
          </div>
        </div>
      </div>
    </div>
  )
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-display text-3xl font-bold text-foreground md:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Starter workflows, self-serve plans, and Founders—answered in plain language
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
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

        <div className="mt-8 text-center">
          <p className="text-muted-foreground">
            Still have questions?{" "}
            <a
              href="mailto:hello@247aiemployees.net"
              className="text-primary hover:underline"
            >
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
