-- Add transaction_id and ip_address to payment_requests table
ALTER TABLE public.payment_requests 
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Add unique constraint on transaction_id (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_requests_transaction_id 
ON public.payment_requests (transaction_id) 
WHERE transaction_id IS NOT NULL;

-- Add unique constraint on image_hash in payment_image_hashes table
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_image_hashes_unique 
ON public.payment_image_hashes (image_hash);

-- Add transaction_id to payment_image_hashes for cross-reference
ALTER TABLE public.payment_image_hashes
ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- Create index for faster duplicate checks
CREATE INDEX IF NOT EXISTS idx_payment_image_hashes_admin_id 
ON public.payment_image_hashes (admin_id);

-- Create audit table for payment fraud tracking
CREATE TABLE IF NOT EXISTS public.payment_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  image_hash TEXT,
  transaction_id TEXT,
  amount NUMERIC,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super admins can read audit log (via edge function with service role)
CREATE POLICY "No direct access to payment audit log" 
ON public.payment_audit_log 
FOR ALL 
USING (false);

-- Create index for audit log queries
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_admin_id 
ON public.payment_audit_log (admin_id);

CREATE INDEX IF NOT EXISTS idx_payment_audit_log_created_at 
ON public.payment_audit_log (created_at DESC);