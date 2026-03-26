"use client"

import { useState, useCallback, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, Check, Loader2, AlertTriangle } from "lucide-react"
import { TOKEN_PACKS } from "@/lib/products"
import { createTokenPackCheckout } from "@/app/actions/stripe"
import { loadStripe } from "@stripe/stripe-js"
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js"

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

interface TokenUpsellModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUsage: number
  limit: number
  currentTier: string
}

export function TokenUpsellModal({
  open,
  onOpenChange,
  currentUsage,
  limit,
  currentTier,
}: TokenUpsellModalProps) {
  const [selectedPack, setSelectedPack] = useState<string | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const usagePercent = Math.min((currentUsage / limit) * 100, 100)
  const isAtLimit = currentUsage >= limit

  const handleSelectPack = async (packId: string) => {
    setSelectedPack(packId)
    setLoading(true)
    setError(null)

    try {
      const { clientSecret } = await createTokenPackCheckout(packId)
      setClientSecret(clientSecret)
      setShowCheckout(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setShowCheckout(false)
    setClientSecret(null)
    setSelectedPack(null)
  }

  useEffect(() => {
    if (!open) {
      setShowCheckout(false)
      setClientSecret(null)
      setSelectedPack(null)
      setError(null)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {!showCheckout ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Zap className="h-5 w-5 text-amber-500" />
                Need More Tasks?
              </DialogTitle>
              <DialogDescription>
                {isAtLimit
                  ? "You've reached your monthly task limit. Purchase additional tasks to keep your AI employees working."
                  : `You're approaching your monthly limit (${currentUsage}/${limit} tasks used). Stock up on extra tasks to avoid interruptions.`}
              </DialogDescription>
            </DialogHeader>

            {/* Usage indicator */}
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Usage</span>
                <span className={isAtLimit ? "text-destructive font-medium" : "text-foreground"}>
                  {currentUsage.toLocaleString()} / {limit.toLocaleString()} tasks
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${
                    usagePercent >= 100
                      ? "bg-destructive"
                      : usagePercent >= 80
                      ? "bg-amber-500"
                      : "bg-primary"
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              {isAtLimit && (
                <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Your AI employees are paused until you add more tasks</span>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Token pack options */}
            <div className="grid gap-4 sm:grid-cols-3">
              {TOKEN_PACKS.map((pack) => (
                <Card
                  key={pack.id}
                  className={`relative cursor-pointer transition-all hover:border-primary ${
                    selectedPack === pack.id ? "border-primary ring-2 ring-primary/20" : ""
                  } ${pack.popular ? "border-primary/50" : ""}`}
                  onClick={() => !loading && handleSelectPack(pack.id)}
                >
                  {pack.popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  {pack.savings && (
                    <Badge
                      variant="secondary"
                      className="absolute -top-2 right-2 bg-emerald-500/10 text-emerald-500"
                    >
                      {pack.savings}
                    </Badge>
                  )}
                  <CardHeader className="pb-2 pt-6">
                    <CardTitle className="text-lg">{pack.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {pack.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3">
                      <span className="text-3xl font-bold text-foreground">
                        ${(pack.priceInCents / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-foreground">
                        {pack.tasks.toLocaleString()}
                      </span>{" "}
                      tasks
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      ${((pack.priceInCents / 100) / pack.tasks).toFixed(3)} per task
                    </div>
                    <Button
                      className="mt-4 w-full"
                      variant={pack.popular ? "default" : "outline"}
                      disabled={loading}
                    >
                      {loading && selectedPack === pack.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Select"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center text-xs text-muted-foreground">
              <p>Tasks never expire and are added to your account immediately.</p>
              <p className="mt-1">
                Want unlimited tasks?{" "}
                <a href="/dashboard/billing" className="text-primary hover:underline">
                  Upgrade to Enterprise
                </a>
              </p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  Back
                </Button>
                <DialogTitle>Complete Purchase</DialogTitle>
              </div>
            </DialogHeader>

            {clientSecret && (
              <div className="min-h-[400px]">
                <EmbeddedCheckoutProvider
                  stripe={stripePromise}
                  options={{ clientSecret }}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
