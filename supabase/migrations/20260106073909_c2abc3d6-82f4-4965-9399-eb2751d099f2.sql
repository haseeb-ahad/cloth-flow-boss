-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view products for public product page" ON public.products;

-- Create a new policy that only allows public access when user is NOT authenticated
-- This is for the public product page (QR code scanning)
CREATE POLICY "Public can view products when not authenticated" 
ON public.products 
FOR SELECT 
USING (
  (auth.uid() IS NULL) AND ((is_deleted = false) OR (is_deleted IS NULL))
);