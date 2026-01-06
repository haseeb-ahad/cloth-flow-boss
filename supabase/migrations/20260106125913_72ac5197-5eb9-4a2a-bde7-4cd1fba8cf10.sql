-- Create customers table for centralized customer management with name normalization
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  customer_name_normalized TEXT NOT NULL,
  customer_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create unique index on normalized name per owner to prevent duplicates
CREATE UNIQUE INDEX customers_owner_normalized_name_unique 
ON public.customers (owner_id, customer_name_normalized) 
WHERE is_deleted = false;

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their team customers" 
ON public.customers 
FOR SELECT 
USING ((owner_id = get_owner_id(auth.uid())) AND (is_deleted = false));

CREATE POLICY "Users can create customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (owner_id = get_owner_id(auth.uid()));

CREATE POLICY "Users can update their team customers" 
ON public.customers 
FOR UPDATE 
USING (owner_id = get_owner_id(auth.uid()));

CREATE POLICY "Users can delete their team customers" 
ON public.customers 
FOR DELETE 
USING (owner_id = get_owner_id(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to normalize customer names (trim, lowercase, single spaces)
CREATE OR REPLACE FUNCTION public.normalize_customer_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Trim leading/trailing spaces, replace multiple spaces with single space, convert to lowercase
  RETURN LOWER(TRIM(REGEXP_REPLACE(name, '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-set normalized name on insert/update
CREATE OR REPLACE FUNCTION public.set_customer_name_normalized()
RETURNS TRIGGER AS $$
BEGIN
  NEW.customer_name_normalized := public.normalize_customer_name(NEW.customer_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_normalize_name
BEFORE INSERT OR UPDATE OF customer_name ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.set_customer_name_normalized();

-- Migrate existing customers from sales, credits, and payment_ledger tables
-- This inserts unique customers per owner, using the first occurrence's phone number
INSERT INTO public.customers (owner_id, customer_name, customer_name_normalized, customer_phone)
SELECT DISTINCT ON (owner_id, LOWER(TRIM(REGEXP_REPLACE(customer_name, '\s+', ' ', 'g'))))
  owner_id,
  customer_name,
  LOWER(TRIM(REGEXP_REPLACE(customer_name, '\s+', ' ', 'g'))) as customer_name_normalized,
  customer_phone
FROM (
  SELECT owner_id, customer_name, customer_phone FROM public.sales 
  WHERE customer_name IS NOT NULL AND customer_name != '' AND owner_id IS NOT NULL AND is_deleted = false
  UNION ALL
  SELECT owner_id, customer_name, customer_phone FROM public.credits 
  WHERE customer_name IS NOT NULL AND customer_name != '' AND owner_id IS NOT NULL AND is_deleted = false
  UNION ALL
  SELECT owner_id, customer_name, customer_phone FROM public.payment_ledger 
  WHERE customer_name IS NOT NULL AND customer_name != '' AND owner_id IS NOT NULL AND is_deleted = false
) combined
WHERE owner_id IS NOT NULL
ORDER BY owner_id, LOWER(TRIM(REGEXP_REPLACE(customer_name, '\s+', ' ', 'g'))), customer_phone NULLS LAST;