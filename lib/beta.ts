/** Pro-tier plans eligible for the beta program (Entrepreneur + Business). */
export const BETA_ELIGIBLE_PLAN_IDS = ["entrepreneur", "business"] as const

export type BetaEligiblePlanId = (typeof BETA_ELIGIBLE_PLAN_IDS)[number]

export function isBetaEligiblePlanId(planId: string): planId is BetaEligiblePlanId {
  return (BETA_ELIGIBLE_PLAN_IDS as readonly string[]).includes(planId)
}

export const BETA_PROMO_CODE = "BETA"

export const BETA_DISCLAIMER_SHORT =
  "Beta pricing is 50% off annual Entrepreneur or Business plans when you use promo code BETA at checkout (or when your discount is applied automatically). Beta access is offered in exchange for your participation: you agree to provide good-faith product feedback when we request it, and to remain subscribed and use the product for at least twelve (12) months from your start date, subject to our Terms and applicable law."

export const BETA_CHECKBOX_LABEL =
  "I understand I am joining the beta program, I agree to provide feedback when asked, and I commit to 12 months of participation as described above."
