-- Phase 4: Branded public experience (optional tenant landing, auth chrome, SEO, legal links, support copy)

ALTER TABLE public.user_white_label_settings
  ADD COLUMN IF NOT EXISTS public_landing_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS page_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS og_image_url TEXT,
  ADD COLUMN IF NOT EXISTS privacy_policy_url TEXT,
  ADD COLUMN IF NOT EXISTS terms_of_service_url TEXT,
  ADD COLUMN IF NOT EXISTS hero_headline TEXT,
  ADD COLUMN IF NOT EXISTS hero_subheadline TEXT,
  ADD COLUMN IF NOT EXISTS hero_primary_cta_label TEXT,
  ADD COLUMN IF NOT EXISTS hero_primary_cta_href TEXT,
  ADD COLUMN IF NOT EXISTS support_page_markdown TEXT,
  ADD COLUMN IF NOT EXISTS branded_auth_enabled BOOLEAN NOT NULL DEFAULT true;

-- Public read for anonymous visitors on a tenant host (no row data exposed without valid host)
CREATE OR REPLACE FUNCTION public.get_branded_public_context(p_host TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  tid UUID;
  wl RECORD;
BEGIN
  IF p_host IS NULL OR length(trim(p_host)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT r.user_id INTO tid
  FROM (
    SELECT ts.user_id, 1 AS ord
    FROM tenant_subdomains ts
    WHERE ts.is_active IS TRUE
      AND lower(trim(ts.host)) = lower(trim(p_host))
    UNION ALL
    SELECT ts2.user_id, 2 AS ord
    FROM user_custom_domains ucd
    INNER JOIN tenant_subdomains ts2 ON ts2.user_id = ucd.user_id AND ts2.is_active IS TRUE
    WHERE ucd.is_active IS TRUE
      AND ucd.status IN ('verified', 'active')
      AND lower(trim(ucd.hostname)) = lower(trim(p_host))
  ) r
  ORDER BY r.ord
  LIMIT 1;

  IF tid IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = tid AND p.subscription_tier = 'enterprise') THEN
    RETURN NULL;
  END IF;

  SELECT * INTO wl
  FROM public.user_white_label_settings wls
  WHERE wls.user_id = tid;

  IF wl IS NULL OR wl.enabled IS NOT TRUE THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'user_id', tid,
    'brand_name', wl.brand_name,
    'logo_url', wl.logo_url,
    'primary_color', wl.primary_color,
    'support_email', wl.support_email,
    'remove_247_branding', wl.remove_247_branding,
    'public_landing_enabled', COALESCE(wl.public_landing_enabled, false),
    'branded_auth_enabled', COALESCE(wl.branded_auth_enabled, true),
    'page_title', wl.page_title,
    'meta_description', wl.meta_description,
    'og_image_url', wl.og_image_url,
    'privacy_policy_url', wl.privacy_policy_url,
    'terms_of_service_url', wl.terms_of_service_url,
    'hero_headline', wl.hero_headline,
    'hero_subheadline', wl.hero_subheadline,
    'hero_primary_cta_label', wl.hero_primary_cta_label,
    'hero_primary_cta_href', wl.hero_primary_cta_href,
    'support_page_markdown', wl.support_page_markdown
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_branded_public_context(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_branded_public_context(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_branded_public_context(TEXT) TO authenticated;
