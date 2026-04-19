"use client"

import Link from "next/link"
import Image from "next/image"
import { buttonVariants } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-[100] border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="247 AI Employees"
            width={48}
            height={48}
            className="h-12 w-auto"
          />
          <span className="hidden font-display text-lg font-bold text-foreground sm:inline">
            247aiemployees.net
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="/#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Features
          </a>
          <a href="/#starter" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Starters
          </a>
          <a href="/#agents" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            AI Employees
          </a>
          <a href="/#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </a>
          <Link href="/done-for-you" className="text-sm font-medium text-foreground transition-colors hover:text-primary">
            Done for you
          </Link>
          <Link href="/contact" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Contact Us
          </Link>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/auth/login" className={cn(buttonVariants({ variant: "ghost" }))}>
            Log In
          </Link>
          <Link href="/auth/sign-up" className={cn(buttonVariants())}>
            Get Started
          </Link>
        </div>

        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border/50 bg-background px-6 pb-6 md:hidden">
          <div className="flex flex-col gap-4 pt-4">
            <a href="/#features" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="/#starter" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Starters</a>
            <a href="/#agents" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>AI Employees</a>
            <a href="/#pricing" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Pricing</a>
            <Link href="/done-for-you" className="text-sm font-medium text-foreground" onClick={() => setMobileOpen(false)}>Done for you</Link>
            <Link href="/contact" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Contact Us</Link>
            <div className="flex flex-col gap-2 pt-2">
              <Link href="/auth/login" className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-center")}>
                Log In
              </Link>
              <Link href="/auth/sign-up" className={cn(buttonVariants(), "w-full justify-center")}>
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
