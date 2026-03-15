"use client"

import { useState } from "react"
import Link from "next/link"
import { PLANS } from "@/lib/products"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function Pricing() {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month")

  return (
    <section id="pricing" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-balance text-3xl font-bold text-foreground sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Choose the plan that fits your needs. Save 2 months with annual billing.
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

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
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
                  "relative flex flex-col rounded-2xl border bg-card p-8 transition-all",
                  plan.popular
                    ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                    : "border-border/50 hover:border-primary/30"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    Most Popular
                  </div>
                )}

                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>

                <div className="mt-6">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold text-foreground">
                      ${displayPrice}
                    </span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  {billingInterval === "year" && (
                    <div className="mt-1 space-y-1">
                      <p className="text-sm text-muted-foreground">
                        <span className="line-through">${monthlyEquivalent}/mo</span>
                        <span className="ml-2 text-primary font-medium">
                          Save ${savings}/year
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Billed annually at ${price / 100}
                      </p>
                    </div>
                  )}
                </div>

                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="mt-8 w-full"
                  variant={plan.popular ? "default" : "outline"}
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
      </div>
    </section>
  )
}
