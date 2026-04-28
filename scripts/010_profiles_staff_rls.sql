-- Staff (admin) can read/update any profile for the admin console, including api_access_suspended.
-- Uses a SECURITY DEFINER helper so the policy body does not recurse on RLS when reading the caller's row.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_platform_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT (COALESCE(p.is_admin, false) OR COALESCE(p.is_superadmin, false))
      FROM public.profiles p
      WHERE p.id = auth.uid()
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_staff() TO service_role;

DROP POLICY IF EXISTS "profiles_staff_select" ON public.profiles;
CREATE POLICY "profiles_staff_select"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_platform_staff());

DROP POLICY IF EXISTS "profiles_staff_update" ON public.profiles;
CREATE POLICY "profiles_staff_update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_staff())
  WITH CHECK (public.is_platform_staff());
