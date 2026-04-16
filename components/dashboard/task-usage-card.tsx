"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Zap, AlertTriangle } from "lucide-react"
import { TokenUpsellModal } from "./token-upsell-modal"

interface TaskUsageCardProps {
  tasksUsed: number
  taskLimit: number
  subscriptionTier: string
}

export function TaskUsageCard({ tasksUsed, taskLimit, subscriptionTier }: TaskUsageCardProps) {
  const [showUpsell, setShowUpsell] = useState(false)
  const [autoShowedUpsell, setAutoShowedUpsell] = useState(false)

  const usagePercent = Math.min(Math.round((tasksUsed / taskLimit) * 100), 100)
  const remaining = Math.max(taskLimit - tasksUsed, 0)
  const isAtLimit = tasksUsed >= taskLimit
  const isNearLimit = usagePercent >= 80

  // Auto-show upsell when at limit (only once per session)
  useEffect(() => {
    if (isAtLimit && !autoShowedUpsell) {
      setShowUpsell(true)
      setAutoShowedUpsell(true)
    }
  }, [isAtLimit, autoShowedUpsell])

  return (
    <>
      <Card className={`bg-card border-border ${isAtLimit ? "border-destructive/50" : isNearLimit ? "border-amber-500/50" : ""}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Tasks Used</CardTitle>
          <Zap className={`h-4 w-4 ${isAtLimit ? "text-destructive" : isNearLimit ? "text-amber-500" : "text-primary"}`} />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-foreground">{tasksUsed.toLocaleString()}</div>
            {isAtLimit && (
              <span className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Limit reached
              </span>
            )}
          </div>
          <Progress 
            value={usagePercent} 
            className={`mt-2 h-2 ${isAtLimit ? "[&>div]:bg-destructive" : isNearLimit ? "[&>div]:bg-amber-500" : ""}`} 
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {remaining.toLocaleString()} of {taskLimit.toLocaleString()} remaining
            </p>
            {(isNearLimit || isAtLimit) && (
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0 text-xs text-primary"
                onClick={() => setShowUpsell(true)}
              >
                Get more tasks
              </Button>
            )}
          </div>
          {isAtLimit && (
            <div className="mt-3 p-2 rounded bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive">
                Your AI employees are paused. Purchase more tasks to continue automation.
              </p>
              <Button 
                size="sm" 
                className="mt-2 w-full"
                onClick={() => setShowUpsell(true)}
              >
                <Zap className="h-4 w-4 mr-1" />
                Buy More Tasks
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <TokenUpsellModal
        open={showUpsell}
        onOpenChange={setShowUpsell}
        currentUsage={tasksUsed}
        limit={taskLimit}
        currentTier={subscriptionTier}
      />
    </>
  )
}
