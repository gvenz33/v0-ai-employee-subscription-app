/**
 * How task credits relate to LLM usage (for customer-facing copy).
 * Implementation uses the Vercel AI SDK with OpenAI models (see app/api/chat, app/api/tasks/process).
 */

export const PRIMARY_AI_MODEL = "openai/gpt-4o-mini" as const

export const PROVIDER_SUMMARY =
  "AI replies run through the Vercel AI SDK using OpenAI models (e.g. gpt-4o-mini for most interactions). You are billed in the product as **task credits**; behind the scenes each interaction consumes model **tokens** (input + output)."

/** Approximate public list pricing — actual invoice varies by token counts; we add platform margin in pack & subscription pricing. */
export const INDICATIVE_PROVIDER_COST = {
  /** USD per 1M input tokens (order of magnitude for gpt-4o class mini models) */
  perMillionInputUsd: 0.15,
  /** USD per 1M output tokens */
  perMillionOutputUsd: 0.6,
}

export interface TaskCostGuideRow {
  activity: string
  typicalTokens: string
  notes: string
}

/** User-facing guide: one “task” in the dashboard = one billable task credit for chat or automation. */
export const TASK_COST_GUIDE: TaskCostGuideRow[] = [
  {
    activity: "Short chat reply",
    typicalTokens: "~400–1,200 total",
    notes: "Brief assistant message after your prompt.",
  },
  {
    activity: "Typical chat turn",
    typicalTokens: "~1,500–4,000",
    notes: "Longer context or multi-turn conversation.",
  },
  {
    activity: "Queued / API task (generateText)",
    typicalTokens: "Varies with prompt + output",
    notes: "Webhook and background tasks record real token usage in task logs.",
  },
  {
    activity: "Subscription monthly allowance",
    typicalTokens: "Capped by task credits",
    notes: "Each plan includes a monthly task budget; packs add credits that increase your cap.",
  },
]

export function formatProviderCostDisclaimer(): string {
  return (
    `Pack prices include our margin over indicative provider rates (approximately $${INDICATIVE_PROVIDER_COST.perMillionInputUsd}/1M input and $${INDICATIVE_PROVIDER_COST.perMillionOutputUsd}/1M output for comparable models — subject to OpenAI’s current pricing). ` +
    "Your usage may vary with prompt length and model choice."
  )
}
