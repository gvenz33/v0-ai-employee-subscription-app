-- Superadmin-managed negotiated pricing for Founders/Enterprise accounts

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS enterprise_custom_monthly_cents INTEGER;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS enterprise_custom_yearly_cents INTEGER;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_enterprise_custom_monthly_nonnegative;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_enterprise_custom_monthly_nonnegative
  CHECK (
    enterprise_custom_monthly_cents IS NULL
    OR enterprise_custom_monthly_cents >= 0
  );

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_enterprise_custom_yearly_nonnegative;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_enterprise_custom_yearly_nonnegative
  CHECK (
    enterprise_custom_yearly_cents IS NULL
    OR enterprise_custom_yearly_cents >= 0
  );
