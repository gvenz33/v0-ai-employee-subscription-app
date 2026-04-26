-- White-label configuration for enterprise/founders users
CREATE TABLE IF NOT EXISTS public.user_white_label_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  brand_name TEXT,
  logo_url TEXT,
  support_email TEXT,
  primary_color TEXT,
  remove_247_branding BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_white_label_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_white_label_select_own" ON public.user_white_label_settings;
CREATE POLICY "user_white_label_select_own"
  ON public.user_white_label_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_white_label_insert_own" ON public.user_white_label_settings;
CREATE POLICY "user_white_label_insert_own"
  ON public.user_white_label_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_white_label_update_own" ON public.user_white_label_settings;
CREATE POLICY "user_white_label_update_own"
  ON public.user_white_label_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- SLA escalation tickets for enterprise/founders users
CREATE TABLE IF NOT EXISTS public.sla_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'standard' CHECK (severity IN ('standard', 'urgent', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_tickets_user_id_created_at
  ON public.sla_tickets(user_id, created_at DESC);

ALTER TABLE public.sla_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sla_tickets_select_own" ON public.sla_tickets;
CREATE POLICY "sla_tickets_select_own"
  ON public.sla_tickets FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sla_tickets_insert_own" ON public.sla_tickets;
CREATE POLICY "sla_tickets_insert_own"
  ON public.sla_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

