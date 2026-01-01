-- Add date_complete column to credits table
ALTER TABLE public.credits ADD COLUMN IF NOT EXISTS date_complete date;