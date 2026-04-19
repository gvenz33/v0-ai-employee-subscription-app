import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Hammer, Sparkles } from "lucide-react"

export function PathChoice() {
  return (
    <div className="mx-auto mt-10 w-full max-w-3xl">
      <p className="mb-4 text-center text-sm font-medium text-muted-foreground">
        Choose how you want to work with us
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col rounded-2xl border border-border/50 bg-card p-6 text-left shadow-sm transition-colors hover:border-primary/30 hover:shadow-md">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground">Do it yourself</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
            Templates, starter automations, and one-click workflows. Run lean, move fast, stay in control.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button className="w-full gap-2" asChild>
              <Link href="/auth/sign-up">
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="/#starter">See starter workflows</a>
            </Button>
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-border/50 bg-card p-6 text-left shadow-sm transition-colors hover:border-primary/30 hover:shadow-md">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Hammer className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground">Custom build</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
            Bespoke automations and a tailored agent stack—we design, implement, and refine so you are not stuck
            configuring everything yourself.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button className="w-full gap-2" variant="secondary" asChild>
              <Link href="/done-for-you">
                Explore custom build
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" asChild>
              <Link href="/contact">Talk to us</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
