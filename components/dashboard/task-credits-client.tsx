"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap } from "lucide-react"
import { TokenUpsellModal } from "@/components/dashboard/token-upsell-modal"

interface TaskCreditsClientProps {
  tasksUsed: number
  tasksLimit: number
  subscriptionTier: string
}

export function TaskCreditsClient({
  tasksUsed,
  tasksLimit,
  subscriptionTier,
}: TaskCreditsClientProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Buy task credits</CardTitle>
          <CardDescription>
            Add credits to your monthly cap anytime. Credits apply immediately after payment.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Current usage:{" "}
            <span className="font-medium text-foreground">
              {tasksUsed.toLocaleString()} / {tasksLimit.toLocaleString()}
            </span>{" "}
            tasks this period.
          </p>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Zap className="h-4 w-4" />
            Choose a pack
          </Button>
        </CardContent>
      </Card>

      <TokenUpsellModal
        open={open}
        onOpenChange={setOpen}
        currentUsage={tasksUsed}
        limit={tasksLimit}
        currentTier={subscriptionTier}
      />
    </>
  )
}
