-- Add quantity_type column to products table
ALTER TABLE public.products ADD COLUMN quantity_type text DEFAULT 'Unit';

-- Add paid_amount column to sales table for partial payments
ALTER TABLE public.sales ADD COLUMN paid_amount numeric DEFAULT 0;

-- Create credit_transactions table for tracking individual credit transactions
CREATE TABLE public.credit_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_id uuid NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  amount numeric NOT NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT credit_transactions_credit_id_fkey FOREIGN KEY (credit_id) REFERENCES credits(id) ON DELETE CASCADE
);

-- Enable RLS on credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for credit_transactions
CREATE POLICY "Allow all operations on credit_transactions" 
ON public.credit_transactions 
FOR ALL 
USING (true) 
WITH CHECK (true);