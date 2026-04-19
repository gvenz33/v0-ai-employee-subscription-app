"use client"

import { useState } from "react"
import Link from "next/link"
import { PLANS } from "@/lib/products"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

function planDisplayName(planId: string, fallback: string) {
  if (planId === "enterprise") return "Founder's"
  return fallback
}

export function Pricing() {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month")

  return (
    <section id="pricing" className="scroll-mt-24 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-balance text-3xl font-bold text-foreground sm:text-4xl">
            Self-serve plans
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Pick a monthly tier and start with templates and workflows in minutes. Save about two months with annual
            billing.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Want implementation and ongoing maintenance instead?{" "}
            <Link href="/done-for-you" className="font-medium text-primary underline-offset-4 hover:underline">
              See done-for-you
            </Link>
            .
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mt-10 flex justify-center">
          <div className="relative flex items-center gap-1 rounded-full bg-muted p-1">
            <button
              onClick={() => setBillingInterval("month")}
              className={cn(
                "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                billingInterval === "month"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("year")}
              className={cn(
                "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                billingInterval === "year"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
              <span className="ml-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                2 months free
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const price = billingInterval === "year" 
              ? plan.annualPriceInCents 
              : plan.monthlyPriceInCents
            
            const displayPrice = billingInterval === "year"
              ? Math.round(price / 12 / 100) // Show monthly equivalent for annual
              : price / 100

            const monthlyEquivalent = plan.monthlyPriceInCents / 100
            const savings = billingInterval === "year" 
              ? (plan.monthlyPriceInCents * 12 - plan.annualPriceInCents) / 100
              : 0

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-card p-6 transition-all",
                  plan.popular
                    ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                    : "border-border/50 hover:border-primary/30"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Most Popular
                  </div>
                )}

                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {planDisplayName(plan.id, plan.name)}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {plan.description}
                  </p>
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-3xl font-bold text-foreground">
                      ${displayPrice}
                    </span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  {billingInterval === "year" && savings > 0 && (
                    <div className="mt-1">
                      <p className="text-xs text-muted-foreground">
                        <span className="line-through">${monthlyEquivalent}/mo</span>
                        <span className="ml-1 text-primary font-medium">
                          Save ${savings}/yr
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                <ul className="mt-6 flex-1 space-y-2">
                  {plan.features.slice(0, 6).map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                  {plan.features.length > 6 && (
                    <li className="text-xs text-primary">
                      +{plan.features.length - 6} more features
                    </li>
                  )}
                </ul>

                <Button
                  className="mt-6 w-full"
                  variant={plan.popular ? "default" : "outline"}
                  size="sm"
                  asChild
                >
                  <Link href={`/auth/sign-up?plan=${plan.id}&interval=${billingInterval}`}>
                    Get Started
                  </Link>
                </Button>
              </div>
            )
          })}
        </div>

        {/* A la carte note */}
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Need a specific bot? Add premium AI employees a la carte starting at $14.99/month
        </p>
      </div>
    </section>
  )
}
