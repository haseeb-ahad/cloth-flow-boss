-- Add description and image_url columns to payment_ledger
ALTER TABLE public.payment_ledger ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.payment_ledger ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for payment images
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-images', 'payment-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payment images
CREATE POLICY "Authenticated users can upload payment images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-images' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view payment images"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-images');

CREATE POLICY "Authenticated users can update their payment images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'payment-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete payment images"
ON storage.objects FOR DELETE
USING (bucket_id = 'payment-images' AND auth.role() = 'authenticated');