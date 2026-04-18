-- Recurring email automations: user-defined prompt + schedule → AI output emailed on each run.
-- Apply in Supabase SQL editor or via migration tooling.

CREATE TABLE IF NOT EXISTS public.scheduled_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ai_employee_id TEXT NOT NULL,
  title TEXT,
  prompt TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  time_local TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly')),
  weekday SMALLINT CHECK (weekday IS NULL OR (weekday >= 0 AND weekday <= 6)),
  delivery_email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT scheduled_automations_weekly_day CHECK (
    frequency <> 'weekly' OR weekday IS NOT NULL
  ),
  CONSTRAINT scheduled_automations_daily_day CHECK (
    frequency <> 'daily' OR weekday IS NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_scheduled_automations_due
  ON public.scheduled_automations (next_run_at)
  WHERE is_active = true;

ALTER TABLE public.scheduled_automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scheduled_automations_select_own" ON public.scheduled_automations;
CREATE POLICY "scheduled_automations_select_own"
  ON public.scheduled_automations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "scheduled_automations_insert_own" ON public.scheduled_automations;
CREATE POLICY "scheduled_automations_insert_own"
  ON public.scheduled_automations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scheduled_automations_update_own" ON public.scheduled_automations;
CREATE POLICY "scheduled_automations_update_own"
  ON public.scheduled_automations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "scheduled_automations_delete_own" ON public.scheduled_automations;
CREATE POLICY "scheduled_automations_delete_own"
  ON public.scheduled_automations FOR DELETE
  USING (auth.uid() = user_id);
