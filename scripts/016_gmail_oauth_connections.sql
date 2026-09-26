-- Gmail OAuth tokens for Email Assistant Emma (drafts + inbox triage).
-- Tokens are encrypted by the app (AUTOMATION_EMAIL_SECRET); never store plaintext.

CREATE TABLE IF NOT EXISTS public.user_gmail_connections (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  scope TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_gmail_connections_email
  ON public.user_gmail_connections(email);

ALTER TABLE public.user_gmail_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_gmail_connections_select_own" ON public.user_gmail_connections;
CREATE POLICY "user_gmail_connections_select_own"
  ON public.user_gmail_connections FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_gmail_connections_insert_own" ON public.user_gmail_connections;
CREATE POLICY "user_gmail_connections_insert_own"
  ON public.user_gmail_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_gmail_connections_update_own" ON public.user_gmail_connections;
CREATE POLICY "user_gmail_connections_update_own"
  ON public.user_gmail_connections FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_gmail_connections_delete_own" ON public.user_gmail_connections;
CREATE POLICY "user_gmail_connections_delete_own"
  ON public.user_gmail_connections FOR DELETE
  USING (auth.uid() = user_id);
