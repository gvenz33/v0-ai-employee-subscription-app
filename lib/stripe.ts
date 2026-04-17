import 'server-only'

import Stripe from 'stripe'

let stripeSingleton: Stripe | null = null

/** Lazy Stripe client so `next build` does not require STRIPE_SECRET_KEY at import time. */
export function getStripe(): Stripe {
  if (!stripeSingleton) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('Missing STRIPE_SECRET_KEY')
    }
    stripeSingleton = new Stripe(key)
  }
  return stripeSingleton
}
