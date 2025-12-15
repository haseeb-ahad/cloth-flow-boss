-- Add description and image_url columns to sales table
ALTER TABLE public.sales 
ADD COLUMN description text,
ADD COLUMN image_url text;