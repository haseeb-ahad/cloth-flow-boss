-- Add is_return column to sale_items table
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS is_return BOOLEAN DEFAULT false;