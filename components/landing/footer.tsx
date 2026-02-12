import { Bot } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border/50 px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold text-foreground">NexusAI</span>
        </div>
        <p className="text-sm text-muted-foreground">
          2026 NexusAI. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
