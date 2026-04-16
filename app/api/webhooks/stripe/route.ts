import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import Stripe from 'stripe'

// Create a Supabase admin client for webhook handling (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      const planId = session.metadata?.plan_id
      const isTokenPack = session.metadata?.type === 'token_pack'
      const tasksToAdd = parseInt(session.metadata?.tasks_to_add || '0', 10)

      if (userId && isTokenPack && tasksToAdd > 0) {
        // Handle token pack purchase - add tasks to user's limit
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('tasks_limit')
          .eq('id', userId)
          .single()

        if (profile) {
          await supabaseAdmin
            .from('profiles')
            .update({
              tasks_limit: profile.tasks_limit + tasksToAdd,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)

          // Store purchase record as invoice
          await supabaseAdmin
            .from('invoices')
            .insert({
              user_id: userId,
              stripe_invoice_id: session.id,
              amount_cents: session.amount_total || 0,
              currency: session.currency || 'usd',
              status: 'paid',
              description: `Token Pack: +${tasksToAdd} tasks`
            })
        }
      } else if (userId && planId) {
        // Handle subscription checkout
        const taskLimits: Record<string, number> = {
          starter: 50,
          pro: 500,
          enterprise: 10000
        }

        // Update user's subscription
        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: planId,
            stripe_subscription_id: session.subscription as string,
            tasks_limit: taskLimits[planId] || 50,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      // Find user by customer ID
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        // Determine the plan from the subscription
        let tier = 'free'
        const amount = subscription.items.data[0]?.price?.unit_amount || 0
        
        if (amount >= 9900) tier = 'enterprise'
        else if (amount >= 4900) tier = 'pro'
        
        const taskLimits: Record<string, number> = {
          free: 50,
          pro: 500,
          enterprise: 10000
        }

        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: subscription.status === 'active' ? tier : 'free',
            tasks_limit: subscription.status === 'active' ? taskLimits[tier] : 50,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      // Find user by customer ID and downgrade to free
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: 'free',
            stripe_subscription_id: null,
            tasks_limit: 50,
            tasks_used: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id)
      }
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      // Find user by customer ID
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        // Store invoice record
        await supabaseAdmin
          .from('invoices')
          .insert({
            user_id: profile.id,
            stripe_invoice_id: invoice.id,
            amount_cents: invoice.amount_paid,
            currency: invoice.currency,
            status: 'paid',
            description: invoice.description || `Subscription payment`,
            invoice_url: invoice.hosted_invoice_url,
            period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
            period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null
          })

        // Reset monthly task usage on successful payment
        await supabaseAdmin
          .from('profiles')
          .update({ tasks_used: 0 })
          .eq('id', profile.id)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      // Find user by customer ID
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        // Store failed invoice record
        await supabaseAdmin
          .from('invoices')
          .insert({
            user_id: profile.id,
            stripe_invoice_id: invoice.id,
            amount_cents: invoice.amount_due,
            currency: invoice.currency,
            status: 'failed',
            description: 'Payment failed',
            invoice_url: invoice.hosted_invoice_url
          })
      }
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return new Response('OK', { status: 200 })
}
