-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tasks_used INTEGER NOT NULL DEFAULT 0,
  tasks_limit INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, subscription_tier, tasks_limit)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    'free',
    50
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- AI Employees table
CREATE TABLE IF NOT EXISTS public.ai_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive')),
  tier_required TEXT NOT NULL DEFAULT 'free' CHECK (tier_required IN ('free', 'pro', 'enterprise')),
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_employees_select_own" ON public.ai_employees FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_employees_insert_own" ON public.ai_employees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_employees_update_own" ON public.ai_employees FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ai_employees_delete_own" ON public.ai_employees FOR DELETE USING (auth.uid() = user_id);

-- Task logs for analytics
CREATE TABLE IF NOT EXISTS public.task_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_employee_id UUID REFERENCES public.ai_employees(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL,
  description TEXT,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_logs_select_own" ON public.task_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "task_logs_insert_own" ON public.task_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  description TEXT,
  invoice_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select_own" ON public.invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "invoices_insert_own" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
