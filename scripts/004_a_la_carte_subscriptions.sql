-- À la carte premium agent subscriptions (Stripe subscription per agent; separate from main plan subscription)
CREATE TABLE IF NOT EXISTS public.a_la_carte_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_a_la_carte_user ON public.a_la_carte_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_a_la_carte_stripe_sub ON public.a_la_carte_subscriptions(stripe_subscription_id);

ALTER TABLE public.a_la_carte_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "a_la_carte_select_own" ON public.a_la_carte_subscriptions;
CREATE POLICY "a_la_carte_select_own" ON public.a_la_carte_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Inserts/updates/deletes only via service role (webhooks) — no client write policies
