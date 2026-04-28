-- Phase 5: Ops, security, SLA hardening — audit logs, incidents, abuse suspension

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS api_access_suspended BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('dashboard', 'api', 'admin', 'system', 'cron')),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_truncated TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_created_at
  ON public.audit_logs(workspace_owner_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_own_workspace" ON public.audit_logs;
CREATE POLICY "audit_logs_select_own_workspace"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = workspace_owner_id);

-- Inserts are performed with the service role from application code (bypasses RLS).

CREATE TABLE IF NOT EXISTS public.ops_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'investigating' CHECK (status IN (
    'investigating', 'identified', 'monitoring', 'resolved'
  )),
  is_public BOOLEAN NOT NULL DEFAULT false,
  affected_workspace_owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_incidents_status_started ON public.ops_incidents(status, started_at DESC);

ALTER TABLE public.ops_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ops_incidents_select_public" ON public.ops_incidents;
CREATE POLICY "ops_incidents_select_public"
  ON public.ops_incidents FOR SELECT
  USING (is_public IS TRUE);

ALTER TABLE public.sla_tickets
  ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES public.ops_incidents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sla_tickets_incident ON public.sla_tickets(incident_id);
