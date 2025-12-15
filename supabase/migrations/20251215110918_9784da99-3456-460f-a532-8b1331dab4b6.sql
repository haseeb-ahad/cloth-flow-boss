-- Add timezone column to app_settings
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Asia/Karachi';