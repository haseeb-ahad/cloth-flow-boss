-- Add owner_id column to tables that need data isolation
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE public.credits ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE public.installments ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE public.installment_payments ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);

-- Get the user_id for ameerhamzasadiq07@gmail.com and update existing data
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT user_id INTO target_user_id FROM public.profiles WHERE email = 'ameerhamzasadiq07@gmail.com' LIMIT 1;
  
  IF target_user_id IS NOT NULL THEN
    UPDATE public.products SET owner_id = target_user_id WHERE owner_id IS NULL;
    UPDATE public.sales SET owner_id = target_user_id WHERE owner_id IS NULL;
    UPDATE public.credits SET owner_id = target_user_id WHERE owner_id IS NULL;
    UPDATE public.credit_transactions SET owner_id = target_user_id WHERE owner_id IS NULL;
    UPDATE public.installments SET owner_id = target_user_id WHERE owner_id IS NULL;
    UPDATE public.installment_payments SET owner_id = target_user_id WHERE owner_id IS NULL;
  END IF;
END $$;

-- Drop existing permissive policies and create new ones with owner isolation

-- Products policies
DROP POLICY IF EXISTS "Allow all operations on products" ON public.products;

CREATE POLICY "Users can view own products" ON public.products
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own products" ON public.products
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own products" ON public.products
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own products" ON public.products
FOR DELETE USING (auth.uid() = owner_id);

-- Sales policies
DROP POLICY IF EXISTS "Allow all operations on sales" ON public.sales;

CREATE POLICY "Users can view own sales" ON public.sales
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own sales" ON public.sales
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own sales" ON public.sales
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own sales" ON public.sales
FOR DELETE USING (auth.uid() = owner_id);

-- Sale items policies (linked via sales)
DROP POLICY IF EXISTS "Allow all operations on sale_items" ON public.sale_items;

CREATE POLICY "Users can view own sale items" ON public.sale_items
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND sales.owner_id = auth.uid())
);

CREATE POLICY "Users can create own sale items" ON public.sale_items
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND sales.owner_id = auth.uid())
);

CREATE POLICY "Users can update own sale items" ON public.sale_items
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND sales.owner_id = auth.uid())
);

CREATE POLICY "Users can delete own sale items" ON public.sale_items
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND sales.owner_id = auth.uid())
);

-- Credits policies
DROP POLICY IF EXISTS "Allow all operations on credits" ON public.credits;

CREATE POLICY "Users can view own credits" ON public.credits
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own credits" ON public.credits
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own credits" ON public.credits
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own credits" ON public.credits
FOR DELETE USING (auth.uid() = owner_id);

-- Credit transactions policies
DROP POLICY IF EXISTS "Allow all operations on credit_transactions" ON public.credit_transactions;

CREATE POLICY "Users can view own credit transactions" ON public.credit_transactions
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own credit transactions" ON public.credit_transactions
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own credit transactions" ON public.credit_transactions
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own credit transactions" ON public.credit_transactions
FOR DELETE USING (auth.uid() = owner_id);

-- Installments policies
DROP POLICY IF EXISTS "Allow all operations on installments" ON public.installments;

CREATE POLICY "Users can view own installments" ON public.installments
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own installments" ON public.installments
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own installments" ON public.installments
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own installments" ON public.installments
FOR DELETE USING (auth.uid() = owner_id);

-- Installment payments policies
DROP POLICY IF EXISTS "Allow all operations on installment_payments" ON public.installment_payments;

CREATE POLICY "Users can view own installment payments" ON public.installment_payments
FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own installment payments" ON public.installment_payments
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own installment payments" ON public.installment_payments
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own installment payments" ON public.installment_payments
FOR DELETE USING (auth.uid() = owner_id);