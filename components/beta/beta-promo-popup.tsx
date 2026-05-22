"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { BETA_PROMO_CODE } from "@/lib/beta"

const STORAGE_KEY = "247ai-beta-promo-dismissed-v1"

function shouldShowOnPath(pathname: string | null): boolean {
  if (!pathname) return false
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api")
  ) {
    return false
  }
  return true
}

export function BetaPromoPopup() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !shouldShowOnPath(pathname)) return
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return
    } catch {
      return
    }
    const t = window.setTimeout(() => setOpen(true), 1200)
    return () => window.clearTimeout(t)
  }, [pathname])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  if (!shouldShowOnPath(pathname)) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss()
        else setOpen(true)
      }}
    >
      <DialogContent className="max-w-md border-primary/20 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">We&apos;re accepting beta testers</DialogTitle>
          <DialogDescription className="text-left space-y-3 pt-1">
            <span className="block text-foreground">
              Use promo code <strong className="text-primary">{BETA_PROMO_CODE}</strong> at checkout for{" "}
              <strong>50% off</strong> annual <strong>Entrepreneur</strong> and <strong>Business</strong> plans.
            </span>
            <span className="block text-sm">
              Beta pricing is <strong>yearly only</strong>. You&apos;ll confirm feedback and 12-month participation
              terms before you pay.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button className="w-full" asChild>
            <Link href="/auth/sign-up">Create an account</Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/dashboard/billing">I already have an account</Link>
          </Button>
          <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={dismiss}>
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
