import Image from "next/image"

export function Footer() {
  return (
    <footer className="border-t border-border/50 px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="247 AI Employees"
            width={40}
            height={40}
            className="h-10 w-auto"
          />
          <span className="font-display text-lg font-bold text-foreground">247aiemployees.net</span>
        </div>
        <p className="text-sm text-muted-foreground">
          2026 247 AI Employees. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
