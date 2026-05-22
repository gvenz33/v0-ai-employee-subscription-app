"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { BETA_CHECKBOX_LABEL, BETA_DISCLAIMER_SHORT } from "@/lib/beta"

type BetaPreCheckoutDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  planName: string
  onConfirmBeta: () => void
  onConfirmFullPrice: () => void
}

export function BetaPreCheckoutDialog({
  open,
  onOpenChange,
  planName,
  onConfirmBeta,
  onConfirmFullPrice,
}: BetaPreCheckoutDialogProps) {
  const [accepted, setAccepted] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (!next) setAccepted(false)
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Beta program — {planName}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-muted-foreground pt-2">
              <p className="font-medium text-foreground">Before you check out</p>
              <p>{BETA_DISCLAIMER_SHORT}</p>
              <p className="text-xs">
                Beta pricing is available on <strong>annual billing only</strong> for Entrepreneur and Business.
                Monthly checkout is not part of the beta offer.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-3">
          <Checkbox
            id="beta-terms"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            aria-describedby="beta-terms-description"
          />
          <Label
            id="beta-terms-description"
            htmlFor="beta-terms"
            className="text-sm font-normal leading-snug cursor-pointer"
          >
            {BETA_CHECKBOX_LABEL}
          </Label>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full"
            disabled={!accepted}
            onClick={() => {
              onConfirmBeta()
              setAccepted(false)
              onOpenChange(false)
            }}
          >
            Continue to checkout (beta pricing)
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              onConfirmFullPrice()
              setAccepted(false)
              onOpenChange(false)
            }}
          >
            Pay full annual price instead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
