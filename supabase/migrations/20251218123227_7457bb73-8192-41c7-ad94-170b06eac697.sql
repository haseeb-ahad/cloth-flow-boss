-- Add daily_price column to plans table
ALTER TABLE public.plans ADD COLUMN daily_price numeric NOT NULL DEFAULT 0;