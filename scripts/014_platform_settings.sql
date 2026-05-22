-- Singleton platform settings (admin console).

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  support_chat_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.platform_settings (id, support_chat_enabled)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_settings_staff_all" ON public.platform_settings;
CREATE POLICY "platform_settings_staff_all"
  ON public.platform_settings
  FOR ALL
  TO authenticated
  USING (public.is_platform_staff())
  WITH CHECK (public.is_platform_staff());

COMMENT ON TABLE public.platform_settings IS 'Global platform toggles; single row id=1.';
COMMENT ON COLUMN public.platform_settings.support_chat_enabled IS 'When false, the public support chat widget and API are disabled.';
