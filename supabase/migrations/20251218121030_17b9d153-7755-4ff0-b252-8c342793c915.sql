
-- Create bank_transfer_settings table for Super Admin bank details
CREATE TABLE public.bank_transfer_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_title text NOT NULL,
  account_number text NOT NULL,
  iban text,
  branch_name text,
  phone_number text,
  instructions text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create payment_requests table for user payment submissions
CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  plan_id uuid REFERENCES public.plans(id),
  amount numeric NOT NULL,
  proof_url text NOT NULL,
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  verified_at timestamp with time zone,
  verified_by text
);

-- Enable RLS
ALTER TABLE public.bank_transfer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Bank settings: Anyone can view (for showing to users)
CREATE POLICY "Anyone can view bank settings"
ON public.bank_transfer_settings
FOR SELECT
USING (true);

-- Payment requests: Users can view their own
CREATE POLICY "Users can view their own payment requests"
ON public.payment_requests
FOR SELECT
USING (admin_id = auth.uid());

-- Payment requests: Users can create their own
CREATE POLICY "Users can create payment requests"
ON public.payment_requests
FOR INSERT
WITH CHECK (admin_id = auth.uid());

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payment proofs
CREATE POLICY "Users can upload payment proofs"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view payment proofs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'payment-proofs');

-- Trigger for updated_at
CREATE TRIGGER update_bank_transfer_settings_updated_at
BEFORE UPDATE ON public.bank_transfer_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_requests_updated_at
BEFORE UPDATE ON public.payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
