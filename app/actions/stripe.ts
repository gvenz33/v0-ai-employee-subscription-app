'use server'

import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import {
  PLANS,
  getPriceInCents,
  TOKEN_PACKS,
  getTokenPackById,
  getEmployeeById,
  A_LA_CARTE_MONTHLY_PRICE_CENTS,
  tierMayPurchaseAlaCarte,
  canAccessEmployee,
} from '@/lib/products'

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

/**
 * Stripe subscription for one premium AI Employee (à la carte). Personal & Entrepreneur only; see Terms.
 */
export async function createAlaCarteCheckoutSession(employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in to subscribe')
  }

  const employee = getEmployeeById(employeeId)
  if (!employee?.isALaCarte) {
    throw new Error('This AI employee is not available à la carte')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, subscription_tier')
    .eq('id', user.id)
    .single()

  const tier = profile?.subscription_tier ?? 'personal'

  if (canAccessEmployee(tier, employee.tier_required)) {
    throw new Error('This AI employee is already included in your plan')
  }

  if (!tierMayPurchaseAlaCarte(tier)) {
    throw new Error(
      'À la carte add-ons are available on Personal and Entrepreneur plans only. Upgrade or change your base plan to use this option.'
    )
  }

  const { data: existing } = await supabase
    .from('a_la_carte_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('employee_id', employeeId)
    .in('status', ['active', 'trialing'])
    .maybeSingle()

  if (existing) {
    throw new Error('You already have an active à la carte subscription for this AI employee')
  }

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      metadata: {
        supabase_user_id: user.id,
      },
    })
    customerId = customer.id

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `À la carte: ${employee.name}`,
            description: `Monthly access to ${employee.name} without upgrading your full plan`,
          },
          unit_amount: A_LA_CARTE_MONTHLY_PRICE_CENTS,
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/dashboard/employees?ala_carte_success=1`,
    cancel_url: `${appUrl}/dashboard/employees?ala_carte_canceled=1`,
    metadata: {
      user_id: user.id,
      type: 'ala_carte_employee',
      employee_id: employeeId,
    },
    ui_mode: 'embedded',
    return_url: `${appUrl}/dashboard/employees?session_id={CHECKOUT_SESSION_ID}`,
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
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/tokens?tokens_purchased=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/tokens?tokens_canceled=true`,
    metadata: {
      user_id: user.id,
      pack_id: packId,
      tasks_to_add: pack.tasks.toString(),
      type: 'token_pack'
    },
    ui_mode: 'embedded',
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/tokens?session_id={CHECKOUT_SESSION_ID}`
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
