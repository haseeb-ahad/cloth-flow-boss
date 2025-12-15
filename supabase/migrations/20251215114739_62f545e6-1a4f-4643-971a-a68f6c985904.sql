-- Create plans table
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  yearly_price NUMERIC NOT NULL DEFAULT 0,
  duration_months INTEGER NOT NULL DEFAULT 1,
  is_lifetime BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  features JSONB NOT NULL DEFAULT '{
    "invoice": {"view": true, "create": true, "edit": true, "delete": true},
    "inventory": {"view": true, "create": true, "edit": true, "delete": true},
    "customers": {"view": true, "create": true, "edit": true, "delete": true},
    "sales": {"view": true, "create": true, "edit": true, "delete": true},
    "credits": {"view": true, "create": true, "edit": true, "delete": true},
    "reports": {"view": true, "create": false, "edit": false, "delete": false},
    "staff": {"view": true, "create": true, "edit": true, "delete": true}
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'free')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  amount_paid NUMERIC DEFAULT 0,
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime')),
  auto_renew BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'nayapay', 'jazzcash', 'easypaisa')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('success', 'failed', 'pending')),
  transaction_id TEXT,
  card_last_four TEXT,
  invoice_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin_feature_overrides table for free plan granular control
CREATE TABLE public.admin_feature_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  feature TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(admin_id, feature)
);

-- Create store_info table for admin store details
CREATE TABLE public.store_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL UNIQUE,
  store_name TEXT,
  store_address TEXT,
  store_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_info ENABLE ROW LEVEL SECURITY;

-- Plans policies (public read, super admin manages via service role)
CREATE POLICY "Anyone can view active plans" ON public.plans FOR SELECT USING (is_active = true);

-- Subscriptions policies
CREATE POLICY "Admins can view their own subscription" ON public.subscriptions FOR SELECT USING (admin_id = auth.uid());
CREATE POLICY "Admins can update their own subscription" ON public.subscriptions FOR UPDATE USING (admin_id = auth.uid());

-- Payments policies
CREATE POLICY "Admins can view their own payments" ON public.payments FOR SELECT USING (admin_id = auth.uid());
CREATE POLICY "Admins can create their own payments" ON public.payments FOR INSERT WITH CHECK (admin_id = auth.uid());

-- Admin feature overrides policies
CREATE POLICY "Admins can view their own feature overrides" ON public.admin_feature_overrides FOR SELECT USING (admin_id = auth.uid());

-- Store info policies
CREATE POLICY "Admins can view their own store info" ON public.store_info FOR SELECT USING (admin_id = auth.uid());
CREATE POLICY "Admins can update their own store info" ON public.store_info FOR UPDATE USING (admin_id = auth.uid());
CREATE POLICY "Admins can insert their own store info" ON public.store_info FOR INSERT WITH CHECK (admin_id = auth.uid());

-- Insert default Free plan
INSERT INTO public.plans (name, description, monthly_price, yearly_price, duration_months, is_lifetime, features)
VALUES (
  'Free',
  'Basic features to get started',
  0,
  0,
  0,
  true,
  '{
    "invoice": {"view": true, "create": true, "edit": false, "delete": false},
    "inventory": {"view": true, "create": true, "edit": false, "delete": false},
    "customers": {"view": true, "create": false, "edit": false, "delete": false},
    "sales": {"view": true, "create": false, "edit": false, "delete": false},
    "credits": {"view": false, "create": false, "edit": false, "delete": false},
    "reports": {"view": false, "create": false, "edit": false, "delete": false},
    "staff": {"view": false, "create": false, "edit": false, "delete": false}
  }'::jsonb
);

-- Add triggers for updated_at
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_admin_feature_overrides_updated_at BEFORE UPDATE ON public.admin_feature_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_info_updated_at BEFORE UPDATE ON public.store_info FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();