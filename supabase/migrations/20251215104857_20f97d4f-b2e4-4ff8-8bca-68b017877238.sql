-- Add worker name and phone fields to app_settings for receipt display
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS worker_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS worker_phone text DEFAULT NULL;