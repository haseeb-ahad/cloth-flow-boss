-- Fix function search path for normalize_customer_name
CREATE OR REPLACE FUNCTION public.normalize_customer_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(TRIM(REGEXP_REPLACE(name, '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Fix function search path for set_customer_name_normalized  
CREATE OR REPLACE FUNCTION public.set_customer_name_normalized()
RETURNS TRIGGER AS $$
BEGIN
  NEW.customer_name_normalized := public.normalize_customer_name(NEW.customer_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;