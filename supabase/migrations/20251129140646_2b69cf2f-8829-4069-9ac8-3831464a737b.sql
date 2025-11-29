-- Add payment_status column to sales table
ALTER TABLE public.sales 
ADD COLUMN payment_status text DEFAULT 'pending';

-- Add a comment to describe the column
COMMENT ON COLUMN public.sales.payment_status IS 'Payment status: paid, pending, partial';