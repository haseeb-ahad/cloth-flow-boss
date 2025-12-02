-- Update products.stock_quantity to numeric for decimal support
ALTER TABLE public.products 
ALTER COLUMN stock_quantity TYPE numeric USING stock_quantity::numeric;

-- Update sale_items.quantity to numeric for decimal support
ALTER TABLE public.sale_items 
ALTER COLUMN quantity TYPE numeric USING quantity::numeric;