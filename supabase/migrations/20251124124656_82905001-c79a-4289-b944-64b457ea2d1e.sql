-- Add sale_id column to credits table to link credits to sales
ALTER TABLE public.credits ADD COLUMN sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX idx_credits_sale_id ON public.credits(sale_id);