-- Add new credit types 'given' and 'taken' for Credit Management
-- Using existing credits table with new credit_type values

-- Add index for better performance on credit_type queries
CREATE INDEX IF NOT EXISTS idx_credits_credit_type_management ON public.credits(credit_type) WHERE credit_type IN ('given', 'taken');

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_credits_status ON public.credits(status);

-- Add index for due_date for overdue calculation
CREATE INDEX IF NOT EXISTS idx_credits_due_date ON public.credits(due_date) WHERE due_date IS NOT NULL;