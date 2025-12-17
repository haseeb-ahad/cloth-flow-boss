-- Add trial_days column to plans table for free trial support
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS trial_days integer DEFAULT 0;

-- Add is_trial column to subscriptions to track trial status
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS is_trial boolean DEFAULT false;

-- Comment for documentation
COMMENT ON COLUMN public.plans.trial_days IS 'Number of free trial days. 0 means no trial.';
COMMENT ON COLUMN public.subscriptions.is_trial IS 'Whether this subscription is currently on a trial period.';