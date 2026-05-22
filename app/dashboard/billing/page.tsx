'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, CreditCard, Download, ExternalLink, AlertCircle } from 'lucide-react'
import { isFoundersPlan, PLANS, getAnnualSavings } from '@/lib/products'
import { isBetaEligiblePlanId, BETA_PROMO_CODE } from '@/lib/beta'
import { Checkout } from '@/components/dashboard/checkout'
import { BetaPreCheckoutDialog } from '@/components/beta/beta-pre-checkout-dialog'
import { createBillingPortalSession, getInvoices } from '@/app/actions/stripe'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface Invoice {
  id: string
  amount: number
  currency: string
  status: string | null
  description: string
  invoiceUrl: string | null
  periodStart: string | null
  periodEnd: string | null
  createdAt: string
}

export default function BillingPage() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')
  
  const [selectedPlan, setSelectedPlan] = useState<{
    id: string
    interval: 'month' | 'year'
    betaEnrollment?: boolean
    promoCode?: string
  } | null>(null)
  const [betaGatePlan, setBetaGatePlan] = useState<{ id: string; name: string } | null>(null)
  const [currentTier, setCurrentTier] = useState<string>('personal')
  const [customMonthlyCents, setCustomMonthlyCents] = useState<number | null>(null)
  const [customYearlyCents, setCustomYearlyCents] = useState<number | null>(null)
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier, enterprise_custom_monthly_cents, enterprise_custom_yearly_cents')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setCurrentTier(profile.subscription_tier)
          setCustomMonthlyCents(profile.enterprise_custom_monthly_cents ?? null)
          setCustomYearlyCents(profile.enterprise_custom_yearly_cents ?? null)
        }

        const invoiceData = await getInvoices()
        setInvoices(invoiceData)
      }
      setLoading(false)
    }
    loadData()
  }, [success])

  const handleManageBilling = async () => {
    setPortalLoading(true)
    try {
      const { url } = await createBillingPortalSession()
      window.location.href = url
    } catch (error) {
      console.error('Error opening billing portal:', error)
    } finally {
      setPortalLoading(false)
    }
  }

  const currentPlan = PLANS.find(p => p.id === currentTier)
  const currentPlanDisplayPrice = (() => {
    if (!currentPlan) return '$9/month'
    if (!isFoundersPlan(currentTier)) return `$${(currentPlan.monthlyPriceInCents || 900) / 100}/month`
    if (customMonthlyCents != null) return `$${(customMonthlyCents / 100).toFixed(2)}/month (custom)`
    return 'Custom pricing (contact sales)'
  })()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription and payment methods
        </p>
      </div>

      {success && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <Check className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-500">Success!</AlertTitle>
          <AlertDescription className="text-green-500/80">
            Your subscription has been updated successfully.
          </AlertDescription>
        </Alert>
      )}

      {canceled && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-500">Checkout Canceled</AlertTitle>
          <AlertDescription className="text-yellow-500/80">
            Your checkout was canceled. No charges were made.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
          <CardDescription>
            Your active subscription details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-foreground">
                {isFoundersPlan(currentTier) ? 'Founders' : (currentPlan?.name || 'Personal')}
              </h3>
              <p className="text-muted-foreground">
                {currentPlanDisplayPrice}
              </p>
              {isFoundersPlan(currentTier) && customYearlyCents != null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Annual custom: ${(customYearlyCents / 100).toFixed(2)}/year
                </p>
              )}
            </div>
            <Badge variant={currentTier === 'enterprise' ? 'default' : 'secondary'}>
              {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
            </Badge>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={handleManageBilling}
            disabled={portalLoading}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {portalLoading ? 'Loading...' : 'Manage Subscription'}
          </Button>
        </CardFooter>
      </Card>

      {/* Available Plans */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            {currentTier === 'enterprise' ? 'Your Plan' : 'Upgrade Your Plan'}
          </h2>
          
          {/* Billing Toggle */}
          <div className="flex items-center gap-1 rounded-full bg-muted p-1">
            <button
              onClick={() => setBillingInterval("month")}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                billingInterval === "month"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("year")}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                billingInterval === "year"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
              <span className="ml-1 text-xs text-primary font-semibold">-17%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => {
            const isCurrentPlan = plan.id === currentTier
            const isFounders = isFoundersPlan(plan.id)
            const isUpgrade = PLANS.findIndex(p => p.id === plan.id) > 
                             PLANS.findIndex(p => p.id === currentTier)
            
            const price = billingInterval === 'year' 
              ? plan.annualPriceInCents 
              : plan.monthlyPriceInCents
            
            const displayPrice = billingInterval === 'year'
              ? Math.round(price / 12 / 100)
              : price / 100

            const savings = getAnnualSavings(plan.id)

            return (
              <Card 
                key={plan.id} 
                className={cn(
                  "border-border bg-card relative",
                  plan.popular && "ring-2 ring-primary",
                  isCurrentPlan && "bg-primary/5"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-2">
                    {isFounders ? (
                      <div className="text-2xl font-bold text-foreground">Custom pricing</div>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-foreground">
                          ${displayPrice}
                        </span>
                        <span className="text-muted-foreground">/month</span>
                      </>
                    )}
                  </div>
                  {billingInterval === 'year' && !isFounders && (
                    <div className="mb-6 space-y-1">
                      <p className="text-sm text-muted-foreground">
                        <span className="line-through">${plan.monthlyPriceInCents / 100}/mo</span>
                        <span className="ml-2 text-primary font-medium">
                          Save ${savings / 100}/year
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Billed annually at ${price / 100}
                      </p>
                    </div>
                  )}
                  {billingInterval === 'month' && <div className="mb-6" />}
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrentPlan ? (
                    <Button className="w-full" variant="secondary" disabled>
                      Current Plan
                    </Button>
                  ) : isFounders ? (
                    <Button className="w-full" asChild>
                      <a href="/contact?subject=Founders%20plan%20consultation">Contact Sales</a>
                    </Button>
                  ) : isUpgrade ? (
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        if (isBetaEligiblePlanId(plan.id) && billingInterval === 'year') {
                          setBetaGatePlan({ id: plan.id, name: plan.name })
                          return
                        }
                        setSelectedPlan({ id: plan.id, interval: billingInterval, betaEnrollment: false })
                      }}
                    >
                      Upgrade to {plan.name}
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      Downgrade via Portal
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Invoice History */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>
            View and download your past invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No invoices yet. Your billing history will appear here.
            </p>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div 
                  key={invoice.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {invoice.description}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(invoice.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium text-foreground">
                        ${(invoice.amount / 100).toFixed(2)}
                      </p>
                      <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                        {invoice.status}
                      </Badge>
                    </div>
                    {invoice.invoiceUrl && (
                      <a 
                        href={invoice.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BetaPreCheckoutDialog
        open={betaGatePlan !== null}
        onOpenChange={(open) => {
          if (!open) setBetaGatePlan(null)
        }}
        planName={betaGatePlan?.name ?? ''}
        onConfirmBeta={() => {
          if (!betaGatePlan) return
          setSelectedPlan({
            id: betaGatePlan.id,
            interval: 'year',
            betaEnrollment: true,
            promoCode: BETA_PROMO_CODE,
          })
        }}
        onConfirmFullPrice={() => {
          if (!betaGatePlan) return
          setSelectedPlan({
            id: betaGatePlan.id,
            interval: 'year',
            betaEnrollment: false,
          })
        }}
      />

      {/* Checkout Modal */}
      {selectedPlan && (
        <Checkout
          planId={selectedPlan.id}
          interval={selectedPlan.interval}
          betaEnrollment={selectedPlan.betaEnrollment ?? false}
          promoCode={selectedPlan.promoCode}
          planName={PLANS.find(p => p.id === selectedPlan.id)?.name || ''}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </div>
  )
}
