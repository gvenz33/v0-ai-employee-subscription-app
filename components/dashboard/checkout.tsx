'use client'

import { useCallback, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js'
import { createCheckoutSession } from '@/app/actions/stripe'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CheckoutProps {
  planId: string
  planName: string
  interval?: 'month' | 'year'
  /** User acknowledged beta terms; server applies BETA discount rules. */
  betaEnrollment?: boolean
  /** Promo code applied at checkout (e.g. BETA). */
  promoCode?: string
  onClose: () => void
}

export function Checkout({
  planId,
  planName,
  interval = 'month',
  betaEnrollment = false,
  promoCode,
  onClose,
}: CheckoutProps) {
  const [error, setError] = useState<string | null>(null)

  const fetchClientSecret = useCallback(async () => {
    try {
      const result = await createCheckoutSession(planId, interval, { betaEnrollment, promoCode })
      if (!result.clientSecret) {
        throw new Error('Failed to create checkout session')
      }
      return result.clientSecret
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }, [planId, interval, betaEnrollment, promoCode])

  const options = { fetchClientSecret }

  if (error) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-border bg-card max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Subscribe to {planName}</CardTitle>
            <CardDescription>
              {interval === 'year' ? 'Annual billing (2 months free)' : 'Monthly billing'}
              {betaEnrollment ? (
                <span className="mt-2 block text-xs text-muted-foreground">
                  Beta checkout: enter promotion code <strong>BETA</strong> if the discount field appears. If your
                  team auto-applies the coupon, you may not need to enter a code.
                </span>
              ) : null}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent>
          <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </CardContent>
      </Card>
    </div>
  )
}
