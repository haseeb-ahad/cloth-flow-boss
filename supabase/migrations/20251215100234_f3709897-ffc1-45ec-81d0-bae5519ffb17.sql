-- Add receipt settings fields to app_settings table
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS shop_name text DEFAULT 'Your Shop Name',
ADD COLUMN IF NOT EXISTS shop_address text DEFAULT 'Your Shop Address Here',
ADD COLUMN IF NOT EXISTS phone_numbers text[] DEFAULT ARRAY['+92-XXX-XXXXXXX']::text[],
ADD COLUMN IF NOT EXISTS thank_you_message text DEFAULT 'Thank You!',
ADD COLUMN IF NOT EXISTS footer_message text DEFAULT 'Get Well Soon';