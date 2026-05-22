-- Promo codes managed in admin console; applied at Stripe checkout.

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  discount_type TEXT NOT NULL DEFAULT 'percent'
    CHECK (discount_type IN ('percent', 'fixed_amount')),
  discount_percent INTEGER
    CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100)),
  discount_amount_cents INTEGER
    CHECK (discount_amount_cents IS NULL OR discount_amount_cents >= 0),
  stripe_coupon_id TEXT,
  stripe_promotion_code_id TEXT,
  eligible_plan_ids TEXT[] NOT NULL DEFAULT '{}',
  billing_intervals TEXT[] NOT NULL DEFAULT ARRAY['month', 'year']::TEXT[],
  max_redemptions INTEGER
    CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  redemption_count INTEGER NOT NULL DEFAULT 0
    CHECK (redemption_count >= 0),
  requires_beta_terms BOOLEAN NOT NULL DEFAULT false,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS promo_codes_code_upper_idx
  ON public.promo_codes (upper(trim(code)));

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_codes_staff_all" ON public.promo_codes;
CREATE POLICY "promo_codes_staff_all"
  ON public.promo_codes
  FOR ALL
  TO authenticated
  USING (public.is_platform_staff())
  WITH CHECK (public.is_platform_staff());

COMMENT ON TABLE public.promo_codes IS 'Subscription promo codes; synced to Stripe coupons/promotion codes when configured.';
