-- Add owner_id column to app_settings for per-admin settings
ALTER TABLE public.app_settings ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Everyone can view app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can update app settings" ON public.app_settings;

-- Create new RLS policies for per-admin settings
CREATE POLICY "Users can view their team app settings"
ON public.app_settings
FOR SELECT
USING (owner_id = get_owner_id(auth.uid()));

CREATE POLICY "Admins can insert their own app settings"
ON public.app_settings
FOR INSERT
WITH CHECK (owner_id = auth.uid() AND is_admin(auth.uid()));

CREATE POLICY "Admins can update their own app settings"
ON public.app_settings
FOR UPDATE
USING (owner_id = auth.uid() AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete their own app settings"
ON public.app_settings
FOR DELETE
USING (owner_id = auth.uid() AND is_admin(auth.uid()));