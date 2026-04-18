-- Per-user SMTP (Gmail / Outlook presets or custom) for scheduled automation emails.
-- Passwords are stored encrypted by the app (AUTOMATION_EMAIL_SECRET); not plain text.

CREATE TABLE IF NOT EXISTS public.user_automation_email_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'smtp')),
  from_name TEXT,
  from_email TEXT NOT NULL,
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL,
  smtp_secure BOOLEAN NOT NULL DEFAULT false,
  smtp_user TEXT NOT NULL,
  smtp_password_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_automation_email_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_automation_email_select_own" ON public.user_automation_email_settings;
CREATE POLICY "user_automation_email_select_own"
  ON public.user_automation_email_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_automation_email_insert_own" ON public.user_automation_email_settings;
CREATE POLICY "user_automation_email_insert_own"
  ON public.user_automation_email_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_automation_email_update_own" ON public.user_automation_email_settings;
CREATE POLICY "user_automation_email_update_own"
  ON public.user_automation_email_settings FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_automation_email_delete_own" ON public.user_automation_email_settings;
CREATE POLICY "user_automation_email_delete_own"
  ON public.user_automation_email_settings FOR DELETE
  USING (auth.uid() = user_id);
