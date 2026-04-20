import { getStripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getTaskLimitForPlanId, inferPlanIdFromStripeUnitAmount } from '@/lib/products'
import { headers } from 'next/headers'
import Stripe from 'stripe'

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(
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
      const isAlaCarte = session.metadata?.type === 'ala_carte_employee'
      const alaCarteEmployeeId = session.metadata?.employee_id
      const tasksToAdd = parseInt(session.metadata?.tasks_to_add || '0', 10)

      if (userId && isTokenPack && tasksToAdd > 0) {
        // Handle token pack purchase - add tasks to user's limit
        const { data: profile } = await getSupabaseAdmin()
          .from('profiles')
          .select('tasks_limit')
          .eq('id', userId)
          .single()

        if (profile) {
          await getSupabaseAdmin()
            .from('profiles')
            .update({
              tasks_limit: profile.tasks_limit + tasksToAdd,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)

          // Store purchase record as invoice
          await getSupabaseAdmin()
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
      } else if (
        userId &&
        isAlaCarte &&
        alaCarteEmployeeId &&
        session.subscription
      ) {
        const stripeSubId = session.subscription as string
        const { data: alaExisting } = await getSupabaseAdmin()
          .from('a_la_carte_subscriptions')
          .select('id')
          .eq('stripe_subscription_id', stripeSubId)
          .maybeSingle()

        if (!alaExisting) {
          await getSupabaseAdmin()
            .from('a_la_carte_subscriptions')
            .insert({
              user_id: userId,
              employee_id: alaCarteEmployeeId,
              stripe_subscription_id: stripeSubId,
              status: 'active',
              updated_at: new Date().toISOString(),
            })
        }
      } else if (userId && planId) {
        // Handle subscription checkout (planId must match PLANS ids: personal, entrepreneur, business, enterprise)
        await getSupabaseAdmin()
          .from('profiles')
          .update({
            subscription_tier: planId,
            stripe_subscription_id: session.subscription as string,
            tasks_limit: getTaskLimitForPlanId(planId),
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const subId = subscription.id

      const { data: alaRow } = await getSupabaseAdmin()
        .from('a_la_carte_subscriptions')
        .select('id')
        .eq('stripe_subscription_id', subId)
        .maybeSingle()

      if (alaRow) {
        await getSupabaseAdmin()
          .from('a_la_carte_subscriptions')
          .update({
            status: subscription.status,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subId)
        break
      }

      const { data: profile } = await getSupabaseAdmin()
        .from('profiles')
        .select('id, stripe_subscription_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile?.stripe_subscription_id === subId) {
        const price = subscription.items.data[0]?.price
        const unitAmount = price?.unit_amount ?? 0
        const interval = price?.recurring?.interval === 'year' ? 'year' : 'month'
        const planId = inferPlanIdFromStripeUnitAmount(unitAmount, interval)

        await getSupabaseAdmin()
          .from('profiles')
          .update({
            subscription_tier: subscription.status === 'active' ? planId : 'free',
            tasks_limit:
              subscription.status === 'active' ? getTaskLimitForPlanId(planId) : 50,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const subId = subscription.id

      const { data: alaRow } = await getSupabaseAdmin()
        .from('a_la_carte_subscriptions')
        .select('id')
        .eq('stripe_subscription_id', subId)
        .maybeSingle()

      if (alaRow) {
        await getSupabaseAdmin()
          .from('a_la_carte_subscriptions')
          .delete()
          .eq('stripe_subscription_id', subId)
        break
      }

      const { data: profile } = await getSupabaseAdmin()
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        await getSupabaseAdmin()
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
      const invoiceSub = invoice.subscription
      const subscriptionId =
        typeof invoiceSub === 'string' ? invoiceSub : invoiceSub?.id ?? null

      const { data: profile } = await getSupabaseAdmin()
        .from('profiles')
        .select('id, stripe_subscription_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        await getSupabaseAdmin()
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

        // Reset monthly task usage only for the main plan subscription (not à la carte add-ons)
        if (subscriptionId && profile.stripe_subscription_id === subscriptionId) {
          await getSupabaseAdmin()
            .from('profiles')
            .update({ tasks_used: 0 })
            .eq('id', profile.id)
        }
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      // Find user by customer ID
      const { data: profile } = await getSupabaseAdmin()
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        // Store failed invoice record
        await getSupabaseAdmin()
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
