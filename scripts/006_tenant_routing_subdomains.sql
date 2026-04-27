-- Tenant slug to user mapping for subdomain routing (phase 2)
CREATE TABLE IF NOT EXISTS public.tenant_subdomains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  host TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$')
);

CREATE INDEX IF NOT EXISTS idx_tenant_subdomains_slug ON public.tenant_subdomains(slug);
CREATE INDEX IF NOT EXISTS idx_tenant_subdomains_host ON public.tenant_subdomains(host);

ALTER TABLE public.tenant_subdomains ENABLE ROW LEVEL SECURITY;

-- App users can read/write their own tenant mapping
DROP POLICY IF EXISTS "tenant_subdomains_select_own" ON public.tenant_subdomains;
CREATE POLICY "tenant_subdomains_select_own"
  ON public.tenant_subdomains FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tenant_subdomains_insert_own" ON public.tenant_subdomains;
CREATE POLICY "tenant_subdomains_insert_own"
  ON public.tenant_subdomains FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tenant_subdomains_update_own" ON public.tenant_subdomains;
CREATE POLICY "tenant_subdomains_update_own"
  ON public.tenant_subdomains FOR UPDATE
  USING (auth.uid() = user_id);

-- Middleware needs anonymous host resolution by host.
DROP POLICY IF EXISTS "tenant_subdomains_select_by_host_public" ON public.tenant_subdomains;
CREATE POLICY "tenant_subdomains_select_by_host_public"
  ON public.tenant_subdomains FOR SELECT
  USING (is_active = true);

