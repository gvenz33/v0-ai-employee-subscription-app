import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"

export function PathChoice() {
  return (
    <div className="mx-auto mt-10 w-full max-w-md">
      <div className="flex flex-col rounded-2xl border border-border/50 bg-card p-6 text-left shadow-sm">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <h2 className="font-display text-lg font-semibold text-foreground">Deploy in minutes</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Pick a starter workflow, deploy an AI Employee in minutes, and run it from your dashboard.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button className="w-full gap-2" asChild>
            <Link href="/auth/sign-up">
              Deploy your first AI Employee
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <a href="/#starter">See starter workflows</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
