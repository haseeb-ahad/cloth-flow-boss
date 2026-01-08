-- Add approval_type to payment_requests
ALTER TABLE public.payment_requests 
ADD COLUMN IF NOT EXISTS approval_type TEXT DEFAULT 'manual';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_requests_approval_type 
ON public.payment_requests (approval_type);

-- Add payment_method check to payment_image_hashes for audit
ALTER TABLE public.payment_image_hashes
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Create index for finding approved payments by user and amount
CREATE INDEX IF NOT EXISTS idx_payment_requests_admin_amount_status 
ON public.payment_requests (admin_id, amount, status);