"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const faqs = [
  {
    question: "How secure is my data with 247 AI Employees?",
    answer:
      "Security is our top priority. All data is encrypted at rest and in transit using AES-256 and TLS 1.3 protocols. We use Supabase for our database with Row Level Security (RLS) enabled, ensuring users can only access their own data. Our payment processing is handled by Stripe, a PCI DSS Level 1 certified provider. We never store sensitive payment information on our servers. Additionally, all API communications are authenticated and rate-limited to prevent abuse.",
  },
  {
    question: "What are AI Employees and how do they work?",
    answer:
      "AI Employees are intelligent agents powered by advanced language models like ChatGPT. Each AI Employee is specialized for a specific role - such as Sales, Marketing, Customer Support, or Data Analysis. You can interact with them via chat, or automate them using webhooks and scheduled tasks. They learn from your instructions and can handle repetitive tasks 24/7 without breaks.",
  },
  {
    question: "Can I upgrade or downgrade my plan at any time?",
    answer:
      "Yes, you can change your subscription plan at any time. When you upgrade, you get immediate access to additional AI Employees and higher task limits. If you downgrade, the change takes effect at the start of your next billing cycle. Any unused tasks do not roll over to the next month.",
  },
  {
    question: "What happens if I exceed my monthly task limit?",
    answer:
      "When you reach your monthly task limit, your AI Employees will pause until your limit resets at the start of your next billing cycle. You can upgrade to a higher tier at any time to immediately unlock more tasks. We also send email notifications when you reach 80% and 100% of your limit so you can plan accordingly.",
  },
  {
    question: "How do webhooks and automation work?",
    answer:
      "Webhooks allow external services (like Zapier, Make, or your own applications) to trigger AI tasks automatically. You generate an API key from your dashboard, then send POST requests to our webhook endpoint with your task details. Tasks are processed in the background, and you can view results in your Task Queue dashboard. This enables powerful automations like processing incoming emails, handling form submissions, or running scheduled reports.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "We offer a 14-day money-back guarantee for new subscribers. If you are not satisfied with our service within the first 14 days, contact our support team for a full refund. After 14 days, we do not offer refunds for partial months, but you can cancel anytime and retain access until the end of your billing period.",
  },
  {
    question: "Can I use 247 AI Employees for my team or business?",
    answer:
      "Absolutely! Our Enterprise plan is designed for teams and businesses. It includes unlimited AI Employees, priority support, custom integrations, and dedicated account management. Contact us for volume pricing if you need to deploy AI Employees across multiple team members or departments.",
  },
]

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string
  answer: string
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
          <p className="text-muted-foreground leading-relaxed">{answer}</p>
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
            Everything you need to know about 247 AI Employees
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
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
              href="mailto:support@247aiemployees.net"
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
