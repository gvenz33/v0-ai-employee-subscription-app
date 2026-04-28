-- Sales pipeline for Founders custom pricing

CREATE TABLE IF NOT EXISTS public.founders_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at TIMESTAMPTZ,

  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT,
  company_size TEXT,
  budget_range TEXT,
  timeline TEXT,
  message TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'contact_form',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'closed_won', 'closed_lost')),

  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  converted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  internal_notes TEXT,
  monthly_quote_cents INTEGER,
  yearly_quote_cents INTEGER
);

CREATE INDEX IF NOT EXISTS idx_founders_leads_status_created_at
  ON public.founders_leads(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_founders_leads_email
  ON public.founders_leads(email);

ALTER TABLE public.founders_leads ENABLE ROW LEVEL SECURITY;

-- App writes/reads this table with service-role in admin APIs and contact endpoint.
