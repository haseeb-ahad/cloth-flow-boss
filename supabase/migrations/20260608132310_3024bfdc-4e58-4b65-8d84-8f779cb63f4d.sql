-- 1. Drop anon SELECT on app_settings (route via public_shop_settings view)
DROP POLICY IF EXISTS "Public can read safe shop fields" ON public.app_settings;

-- 2. Drop anon SELECT on products (route via public_products view)
DROP POLICY IF EXISTS "Public can read safe product fields" ON public.products;

-- 3. Restrict admin_presence SELECT to same tenant
DROP POLICY IF EXISTS "Authenticated users can view presence" ON public.admin_presence;
CREATE POLICY "Users can view their tenant presence"
ON public.admin_presence
FOR SELECT
TO authenticated
USING (admin_id = public.get_owner_id(auth.uid()));

-- 4. Restrict system_settings to service_role only
DROP POLICY IF EXISTS "Authenticated users can read system settings" ON public.system_settings;
CREATE POLICY "Service role only system settings"
ON public.system_settings
FOR SELECT
TO service_role
USING (true);