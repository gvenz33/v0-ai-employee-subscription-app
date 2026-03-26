import Image from "next/image"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border/50 px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
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
          <div className="flex items-center gap-6">
            <Link 
              href="/privacy" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/terms" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Use
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border/50 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; 2026 247 AI Employees. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
