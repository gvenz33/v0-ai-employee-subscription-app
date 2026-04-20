'use client'

import { useCallback, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'
import { createAlaCarteCheckoutSession } from '@/app/actions/stripe'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface AlaCarteCheckoutProps {
  employeeId: string
  employeeName: string
  onClose: () => void
}

export function AlaCarteCheckout({ employeeId, employeeName, onClose }: AlaCarteCheckoutProps) {
  const [error, setError] = useState<string | null>(null)

  const fetchClientSecret = useCallback(async () => {
    try {
      const result = await createAlaCarteCheckoutSession(employeeId)
      if (!result.clientSecret) {
        throw new Error('Failed to create checkout session')
      }
      return result.clientSecret
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    }
  }, [employeeId])

  const options = { fetchClientSecret }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader>
            <CardTitle className="text-destructive">Checkout error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-auto border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Subscribe à la carte</CardTitle>
            <CardDescription>
              {employeeName} — $9.99/mo, cancel anytime in the billing portal
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} type="button">
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
