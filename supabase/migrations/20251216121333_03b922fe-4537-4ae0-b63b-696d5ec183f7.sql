-- Add credit_type and person_type columns to credits table
ALTER TABLE public.credits 
ADD COLUMN credit_type text NOT NULL DEFAULT 'invoice',
ADD COLUMN person_type text;

-- Add comment for clarity
COMMENT ON COLUMN public.credits.credit_type IS 'Type of credit: invoice, cash, manual';
COMMENT ON COLUMN public.credits.person_type IS 'Type of person: customer, supplier, market_person, other';