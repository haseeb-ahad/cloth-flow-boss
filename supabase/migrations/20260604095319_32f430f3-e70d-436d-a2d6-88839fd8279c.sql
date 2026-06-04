
-- 1. Create safe public views for unauthenticated access
CREATE OR REPLACE VIEW public.public_products
WITH (security_invoker = true) AS
SELECT id, name, description, selling_price, category, quantity_type, sku, image_url, owner_id
FROM public.products
WHERE is_deleted = false OR is_deleted IS NULL;

CREATE OR REPLACE VIEW public.public_shop_settings
WITH (security_invoker = true) AS
SELECT owner_id, shop_name, shop_address, logo_url, description, app_name
FROM public.app_settings;

-- Allow anon/auth read on views; underlying tables need a permissive policy for the
-- columns we expose. We'll create scoped row policies for the views below.
GRANT SELECT ON public.public_products TO anon, authenticated;
GRANT SELECT ON public.public_shop_settings TO anon, authenticated;

-- 2. Drop overly-permissive policies
DROP POLICY IF EXISTS "Anyone can view app_settings for public pages" ON public.app_settings;
DROP POLICY IF EXISTS "Public can view products when not authenticated" ON public.products;
DROP POLICY IF EXISTS "Anyone can read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Service role can manage image hashes" ON public.payment_image_hashes;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- 3. Re-create minimal public SELECT policies needed for the views (security_invoker
-- means underlying RLS still applies, so add narrow public SELECT policies on the
-- base tables but the views only expose safe columns).
CREATE POLICY "Public can read safe product fields"
ON public.products FOR SELECT
TO anon
USING ((is_deleted = false OR is_deleted IS NULL));

CREATE POLICY "Public can read safe shop fields"
ON public.app_settings FOR SELECT
TO anon
USING (true);

-- system_settings: restrict to authenticated only
CREATE POLICY "Authenticated users can read system settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);

-- payment_image_hashes: service role only
CREATE POLICY "Service role only manages image hashes"
ON public.payment_image_hashes FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- notifications: only service role can insert
CREATE POLICY "Service role inserts notifications"
ON public.notifications FOR INSERT
TO service_role
WITH CHECK (true);

-- 4. Storage ownership checks (drop overly-permissive then recreate)
DROP POLICY IF EXISTS "Authenticated users can delete payment images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their payment images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update product images" ON storage.objects;

CREATE POLICY "Users can delete their own payment images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own payment images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 5. worker_permissions: add admin_id, backfill, tighten policies
ALTER TABLE public.worker_permissions
  ADD COLUMN IF NOT EXISTS admin_id uuid;

UPDATE public.worker_permissions wp
SET admin_id = ur.admin_id
FROM public.user_roles ur
WHERE wp.worker_id = ur.user_id AND wp.admin_id IS NULL;

DROP POLICY IF EXISTS "Admins can manage permissions" ON public.worker_permissions;
DROP POLICY IF EXISTS "Admins can view all permissions" ON public.worker_permissions;

CREATE POLICY "Admins manage their workers' permissions"
ON public.worker_permissions FOR ALL
TO authenticated
USING (is_admin(auth.uid()) AND admin_id = auth.uid())
WITH CHECK (is_admin(auth.uid()) AND admin_id = auth.uid());

-- 6. Revoke EXECUTE on internal SECURITY DEFINER functions that should not be
-- callable from clients (triggers / cron-style helpers).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_delete_paid_credits() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_password_tokens() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_password_policy_timestamp() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_admin_offline() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_admin_presence_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_customer_name_normalized() FROM anon, authenticated, PUBLIC;
