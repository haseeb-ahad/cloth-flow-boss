-- Add lifetime_price column to plans table
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS lifetime_price numeric NOT NULL DEFAULT 0;