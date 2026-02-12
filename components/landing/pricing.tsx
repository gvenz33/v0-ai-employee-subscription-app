import Link from "next/link"
import { PLANS } from "@/lib/products"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function Pricing() {
  return (
    <section id="pricing" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-balance text-3xl font-bold text-foreground sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Start free, upgrade when you need more power. No hidden fees.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
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
                    {plan.priceInCents === 0
                      ? "Free"
                      : `$${(plan.priceInCents / 100).toFixed(0)}`}
                  </span>
                  {plan.priceInCents > 0 && (
                    <span className="text-sm text-muted-foreground">/month</span>
                  )}
                </div>
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
                <Link href="/auth/sign-up">
                  {plan.priceInCents === 0 ? "Get Started Free" : "Start Free Trial"}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
