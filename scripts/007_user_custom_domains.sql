-- Phase 3: Custom domains (Vercel-managed DNS verification + SSL). Requires VERCEL_TOKEN / VERCEL_PROJECT_ID on server.

CREATE TABLE IF NOT EXISTS public.user_custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending_dns'
    CHECK (status IN (
      'pending_dns',
      'pending_vercel',
      'verified',
      'active',
      'misconfigured',
      'disabled',
      'error'
    )),
  vercel_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  ssl_ready BOOLEAN NOT NULL DEFAULT false,
  health_ok BOOLEAN,
  last_health_check_at TIMESTAMPTZ,
  last_error TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (lower(hostname) = hostname),
  CHECK (hostname ~ '^[a-z0-9](?:[a-z0-9.-]{1,251}[a-z0-9])?$')
);

CREATE INDEX IF NOT EXISTS idx_user_custom_domains_hostname ON public.user_custom_domains(hostname);

ALTER TABLE public.user_custom_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_custom_domains_select_own" ON public.user_custom_domains;
CREATE POLICY "user_custom_domains_select_own"
  ON public.user_custom_domains FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_custom_domains_insert_own" ON public.user_custom_domains;
CREATE POLICY "user_custom_domains_insert_own"
  ON public.user_custom_domains FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_custom_domains_update_own" ON public.user_custom_domains;
CREATE POLICY "user_custom_domains_update_own"
  ON public.user_custom_domains FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_custom_domains_delete_own" ON public.user_custom_domains;
CREATE POLICY "user_custom_domains_delete_own"
  ON public.user_custom_domains FOR DELETE
  USING (auth.uid() = user_id);

-- Resolve tenant by hostname without exposing full tenant tables (used by middleware anon client).
CREATE OR REPLACE FUNCTION public.resolve_tenant_by_host(p_host TEXT)
RETURNS TABLE(user_id UUID, tenant_slug TEXT, resolved_host TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT sub.user_id, sub.tenant_slug::text, sub.resolved_host::text
  FROM (
    SELECT ts.user_id, ts.slug AS tenant_slug, ts.host AS resolved_host, 1 AS ord
    FROM tenant_subdomains ts
    WHERE ts.is_active IS TRUE
      AND lower(trim(ts.host)) = lower(trim(p_host))
    UNION ALL
    SELECT ts2.user_id, ts2.slug AS tenant_slug, ucd.hostname AS resolved_host, 2 AS ord
    FROM user_custom_domains ucd
    INNER JOIN tenant_subdomains ts2 ON ts2.user_id = ucd.user_id AND ts2.is_active IS TRUE
    WHERE ucd.is_active IS TRUE
      AND ucd.status IN ('verified', 'active')
      AND lower(trim(ucd.hostname)) = lower(trim(p_host))
  ) sub
  ORDER BY sub.ord
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_tenant_by_host(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_tenant_by_host(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_tenant_by_host(TEXT) TO authenticated;

-- Remove overly broad tenant resolution policy now that resolve_tenant_by_host handles lookups.
DROP POLICY IF EXISTS "tenant_subdomains_select_by_host_public" ON public.tenant_subdomains;
