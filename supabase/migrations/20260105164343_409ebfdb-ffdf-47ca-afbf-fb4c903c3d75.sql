-- Add RLS policy to allow public read access to products (for QR code scanning)
CREATE POLICY "Anyone can view products for public product page"
ON public.products
FOR SELECT
USING (is_deleted = false OR is_deleted IS NULL);

-- Add RLS policy to allow public read access to app_settings (for shop info on product page)
CREATE POLICY "Anyone can view app_settings for public pages"
ON public.app_settings
FOR SELECT
USING (true);