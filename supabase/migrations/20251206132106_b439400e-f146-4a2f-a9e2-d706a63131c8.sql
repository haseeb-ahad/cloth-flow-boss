-- Create payment_ledger table for tracking all payments received
CREATE TABLE public.payment_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  payment_amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  details JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payment_ledger ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own payment ledger"
ON public.payment_ledger
FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own payment ledger"
ON public.payment_ledger
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own payment ledger"
ON public.payment_ledger
FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own payment ledger"
ON public.payment_ledger
FOR DELETE
USING (auth.uid() = owner_id);