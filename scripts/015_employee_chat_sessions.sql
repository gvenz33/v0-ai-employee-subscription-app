-- Persistent AI Employee chat sessions and messages

CREATE TABLE IF NOT EXISTS public.employee_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_chat_sessions_user_employee
  ON public.employee_chat_sessions(user_id, employee_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.employee_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.employee_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_chat_messages_session
  ON public.employee_chat_messages(session_id, created_at ASC);

ALTER TABLE public.employee_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_chat_sessions_select_own" ON public.employee_chat_sessions;
CREATE POLICY "employee_chat_sessions_select_own"
  ON public.employee_chat_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "employee_chat_sessions_insert_own" ON public.employee_chat_sessions;
CREATE POLICY "employee_chat_sessions_insert_own"
  ON public.employee_chat_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "employee_chat_sessions_update_own" ON public.employee_chat_sessions;
CREATE POLICY "employee_chat_sessions_update_own"
  ON public.employee_chat_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "employee_chat_sessions_delete_own" ON public.employee_chat_sessions;
CREATE POLICY "employee_chat_sessions_delete_own"
  ON public.employee_chat_sessions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "employee_chat_messages_select_own" ON public.employee_chat_messages;
CREATE POLICY "employee_chat_messages_select_own"
  ON public.employee_chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employee_chat_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "employee_chat_messages_insert_own" ON public.employee_chat_messages;
CREATE POLICY "employee_chat_messages_insert_own"
  ON public.employee_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employee_chat_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );
