-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  expense_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their team expenses"
ON public.expenses FOR SELECT
USING (owner_id = get_owner_id(auth.uid()));

CREATE POLICY "Users can create expenses"
ON public.expenses FOR INSERT
WITH CHECK (owner_id = get_owner_id(auth.uid()));

CREATE POLICY "Users can update their team expenses"
ON public.expenses FOR UPDATE
USING (owner_id = get_owner_id(auth.uid()));

CREATE POLICY "Users can delete their team expenses"
ON public.expenses FOR DELETE
USING (owner_id = get_owner_id(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();