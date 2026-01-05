-- Add new columns to products table for SKU, supplier, and image
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS sku text UNIQUE,
ADD COLUMN IF NOT EXISTS supplier_name text,
ADD COLUMN IF NOT EXISTS image_url text;

-- Create index on SKU for fast lookups
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for product images - allow authenticated users to upload
CREATE POLICY "Users can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Create storage policy for public access to product images
CREATE POLICY "Product images are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Create storage policy for authenticated users to update their images
CREATE POLICY "Users can update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

-- Create storage policy for authenticated users to delete their images
CREATE POLICY "Users can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');