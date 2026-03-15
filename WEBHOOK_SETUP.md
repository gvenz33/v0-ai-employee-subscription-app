# Stripe Webhook Setup Guide

This document explains how to configure Stripe webhooks for handling subscription events in your AI Employees platform.

## Overview

Webhooks allow Stripe to notify your application when events happen in your account, such as:
- Successful payments
- Subscription changes
- Failed payments
- Customer updates

## Webhook Endpoint

Your webhook endpoint is located at:
```
/api/webhooks/stripe
```

Full URL (production):
```
https://your-domain.com/api/webhooks/stripe
```

## Environment Variables Required

Add these to your Vercel project settings:

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Your Stripe secret key (starts with `sk_`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (starts with `whsec_`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key (starts with `pk_`) |
| `NEXT_PUBLIC_APP_URL` | Your application URL (e.g., `https://your-domain.com`) |

## Setting Up Webhooks in Stripe Dashboard

### Step 1: Access Webhook Settings

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**

### Step 2: Configure the Endpoint

1. **Endpoint URL**: Enter your webhook URL
   - Development: Use Stripe CLI (see below)
   - Production: `https://your-domain.com/api/webhooks/stripe`

2. **Select events to listen to**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

3. Click **Add endpoint**

### Step 3: Get Your Webhook Secret

1. After creating the endpoint, click on it
2. Under **Signing secret**, click **Reveal**
3. Copy the secret (starts with `whsec_`)
4. Add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

## Local Development with Stripe CLI

### Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (with scoop)
scoop install stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

### Login and Forward Webhooks

```bash
# Login to your Stripe account
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI will output a webhook signing secret. Use this for local development:
```
Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

### Test Webhook Events

```bash
# Trigger a test checkout.session.completed event
stripe trigger checkout.session.completed

# Trigger a subscription created event
stripe trigger customer.subscription.created
```

## Webhook Handler Implementation

The webhook handler at `/api/webhooks/stripe/route.ts` processes the following events:

### `checkout.session.completed`
- Creates/updates the customer's subscription tier
- Updates the user's profile with Stripe customer ID
- Adjusts task limits based on the plan

### `customer.subscription.updated`
- Handles plan upgrades/downgrades
- Updates task limits accordingly
- Logs subscription changes

### `customer.subscription.deleted`
- Resets user to starter tier
- Clears subscription information
- Adjusts task limits

### `invoice.paid`
- Records successful payment
- Creates invoice record in database
- Resets monthly task counter

### `invoice.payment_failed`
- Logs failed payment attempt
- Can trigger notification to user (implement as needed)

## Event Payload Examples

### checkout.session.completed
```json
{
  "id": "cs_xxxxx",
  "object": "checkout.session",
  "customer": "cus_xxxxx",
  "subscription": "sub_xxxxx",
  "metadata": {
    "user_id": "uuid-xxxxx",
    "plan_id": "pro",
    "billing_interval": "month"
  }
}
```

### customer.subscription.updated
```json
{
  "id": "sub_xxxxx",
  "object": "subscription",
  "customer": "cus_xxxxx",
  "status": "active",
  "items": {
    "data": [{
      "price": {
        "id": "price_xxxxx",
        "recurring": {
          "interval": "month"
        }
      }
    }]
  }
}
```

## Tier Mapping

| Plan ID | Task Limit | AI Employees |
|---------|------------|--------------|
| starter | 50/month | 3 |
| pro | 500/month | 10 |
| enterprise | Unlimited | Unlimited |

## Troubleshooting

### Webhook signature verification failed
- Ensure `STRIPE_WEBHOOK_SECRET` matches the endpoint's signing secret
- For local development, use the secret from `stripe listen` output

### Events not being received
- Check that the webhook endpoint is accessible
- Verify the endpoint URL is correct in Stripe Dashboard
- Check Stripe Dashboard → Webhooks → [Your Endpoint] → Webhook attempts

### Database not updating
- Verify Supabase connection is working
- Check RLS policies allow the webhook to update records
- Look for errors in your server logs

## Security Best Practices

1. **Always verify webhook signatures** - The handler does this automatically
2. **Use HTTPS in production** - Stripe requires HTTPS for webhook endpoints
3. **Handle events idempotently** - Events may be delivered more than once
4. **Respond quickly** - Return 200 status within a few seconds
5. **Process asynchronously** - For long operations, queue the work and respond immediately

## Testing Checklist

- [ ] Webhook endpoint is accessible
- [ ] Signature verification works
- [ ] Checkout completion updates user tier
- [ ] Subscription updates are reflected
- [ ] Cancellation resets to starter tier
- [ ] Invoice records are created
- [ ] Task limits are adjusted correctly

## Support

For issues with Stripe integration:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
- [Stripe CLI Reference](https://stripe.com/docs/stripe-cli)
