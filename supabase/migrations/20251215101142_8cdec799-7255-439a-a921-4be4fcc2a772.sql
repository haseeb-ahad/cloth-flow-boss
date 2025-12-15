-- Add owner_names column to app_settings for multiple owner names on receipts
ALTER TABLE public.app_settings
ADD COLUMN owner_names text[] DEFAULT ARRAY['Owner Name']::text[];