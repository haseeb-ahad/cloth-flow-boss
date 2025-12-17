-- Change duration_months column from integer to numeric to support days as fractions
ALTER TABLE public.plans 
ALTER COLUMN duration_months TYPE numeric USING duration_months::numeric;