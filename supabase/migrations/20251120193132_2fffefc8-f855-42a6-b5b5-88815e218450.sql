-- Create installments table
CREATE TABLE public.installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  total_amount NUMERIC NOT NULL,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL,
  installment_amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  next_due_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create installment_payments table for tracking individual payments
CREATE TABLE public.installment_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  installment_id UUID NOT NULL REFERENCES public.installments(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for installments
CREATE POLICY "Allow all operations on installments"
ON public.installments
FOR ALL
USING (true)
WITH CHECK (true);

-- Create policies for installment_payments
CREATE POLICY "Allow all operations on installment_payments"
ON public.installment_payments
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates on installments
CREATE TRIGGER update_installments_updated_at
BEFORE UPDATE ON public.installments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();