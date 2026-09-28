-- Multi-account Gmail connections (up to 20 per user) + Emma scan schedules.

-- 1) Migrate user_gmail_connections: user_id PK → id PK, unique (user_id, email)
ALTER TABLE public.user_gmail_connections
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

UPDATE public.user_gmail_connections
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE public.user_gmail_connections
  ALTER COLUMN id SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_gmail_connections_pkey'
      AND conrelid = 'public.user_gmail_connections'::regclass
  ) THEN
    ALTER TABLE public.user_gmail_connections DROP CONSTRAINT user_gmail_connections_pkey;
  END IF;
END $$;

ALTER TABLE public.user_gmail_connections
  ADD PRIMARY KEY (id);

CREATE UNIQUE INDEX IF NOT EXISTS user_gmail_connections_user_email_uidx
  ON public.user_gmail_connections (user_id, email);

CREATE INDEX IF NOT EXISTS idx_user_gmail_connections_user_id
  ON public.user_gmail_connections (user_id);

-- 2) Emma periodic scan schedules
CREATE TABLE IF NOT EXISTS public.emma_scan_schedules (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  frequency TEXT NOT NULL DEFAULT 'every_4_hours'
    CHECK (frequency IN ('hourly', 'every_2_hours', 'every_4_hours', 'daily')),
  time_local TEXT NOT NULL DEFAULT '09:00',
  delivery_email TEXT NOT NULL,
  auto_create_drafts BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_at TIMESTAMPTZ,
  last_error TEXT,
  last_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emma_scan_schedules_due
  ON public.emma_scan_schedules (next_run_at)
  WHERE is_active = true;

ALTER TABLE public.emma_scan_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emma_scan_schedules_select_own" ON public.emma_scan_schedules;
CREATE POLICY "emma_scan_schedules_select_own"
  ON public.emma_scan_schedules FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "emma_scan_schedules_insert_own" ON public.emma_scan_schedules;
CREATE POLICY "emma_scan_schedules_insert_own"
  ON public.emma_scan_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "emma_scan_schedules_update_own" ON public.emma_scan_schedules;
CREATE POLICY "emma_scan_schedules_update_own"
  ON public.emma_scan_schedules FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "emma_scan_schedules_delete_own" ON public.emma_scan_schedules;
CREATE POLICY "emma_scan_schedules_delete_own"
  ON public.emma_scan_schedules FOR DELETE
  USING (auth.uid() = user_id);
