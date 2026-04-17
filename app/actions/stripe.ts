'use server'

import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { PLANS, getPriceInCents, TOKEN_PACKS, getTokenPackById } from '@/lib/products'

export async function createCheckoutSession(planId: string, interval: 'month' | 'year' = 'month') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in to subscribe')
  }

  const plan = PLANS.find(p => p.id === planId)
  if (!plan) {
    throw new Error('Plan not found')
  }

  const priceInCents = getPriceInCents(planId, interval)
  if (priceInCents === 0) {
    throw new Error('Cannot checkout for free plan')
  }

  // Get or create stripe customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, subscription_tier')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      metadata: {
        supabase_user_id: user.id
      }
    })
    customerId = customer.id

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${plan.name} (${interval === 'year' ? 'Annual' : 'Monthly'})`,
            description: interval === 'year' 
              ? `${plan.description} - Save 2 months with annual billing!`
              : plan.description
          },
          unit_amount: priceInCents,
          recurring: {
            interval: interval
          }
        },
        quantity: 1
      }
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing?canceled=true`,
    metadata: {
      user_id: user.id,
      plan_id: planId,
      billing_interval: interval
    },
    ui_mode: 'embedded',
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`
  })

  return { clientSecret: session.client_secret }
}

export async function createBillingPortalSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    throw new Error('No billing information found')
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing`
  })

  return { url: session.url }
}

export async function cancelSubscription() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_subscription_id) {
    throw new Error('No active subscription found')
  }

  await getStripe().subscriptions.update(profile.stripe_subscription_id, {
    cancel_at_period_end: true
  })

  return { success: true }
}

export async function createTokenPackCheckout(packId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in to purchase tokens')
  }

  const pack = getTokenPackById(packId)
  if (!pack) {
    throw new Error('Token pack not found')
  }

  // Get or create stripe customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      metadata: {
        supabase_user_id: user.id
      }
    })
    customerId = customer.id

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: pack.name,
            description: `${pack.tasks} additional tasks for your AI employees`
          },
          unit_amount: pack.priceInCents
        },
        quantity: 1
      }
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?tokens_purchased=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?tokens_canceled=true`,
    metadata: {
      user_id: user.id,
      pack_id: packId,
      tasks_to_add: pack.tasks.toString(),
      type: 'token_pack'
    },
    ui_mode: 'embedded',
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}`
  })

  return { clientSecret: session.client_secret }
}

export async function getInvoices() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return []
  }

  const invoices = await getStripe().invoices.list({
    customer: profile.stripe_customer_id,
    limit: 100
  })

  return invoices.data.map(invoice => ({
    id: invoice.id,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: invoice.status,
    description: invoice.description || `Invoice for ${invoice.lines.data[0]?.description || 'Subscription'}`,
    invoiceUrl: invoice.hosted_invoice_url,
    periodStart: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
    periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    createdAt: new Date(invoice.created * 1000).toISOString()
  }))
}
