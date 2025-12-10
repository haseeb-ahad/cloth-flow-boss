-- Step 1: Add admin_id column to user_roles to track which admin created the worker
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS admin_id uuid;

-- Step 2: Create a function to get the admin_id for a user (returns own id for admins, admin_id for workers)
CREATE OR REPLACE FUNCTION public.get_owner_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN role = 'admin' THEN user_roles.user_id
      ELSE COALESCE(admin_id, user_roles.user_id)
    END
  FROM public.user_roles 
  WHERE user_roles.user_id = $1
  LIMIT 1;
$$;

-- Step 3: Update RLS policies for products table
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can create products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

CREATE POLICY "Users can view their team products" ON public.products
FOR SELECT USING (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can create products" ON public.products
FOR INSERT WITH CHECK (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can update their team products" ON public.products
FOR UPDATE USING (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can delete their team products" ON public.products
FOR DELETE USING (owner_id = public.get_owner_id(auth.uid()));

-- Step 4: Update RLS policies for sales table
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can create sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can update sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can delete sales" ON public.sales;

CREATE POLICY "Users can view their team sales" ON public.sales
FOR SELECT USING (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can create sales" ON public.sales
FOR INSERT WITH CHECK (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can update their team sales" ON public.sales
FOR UPDATE USING (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can delete their team sales" ON public.sales
FOR DELETE USING (owner_id = public.get_owner_id(auth.uid()));

-- Step 5: Update RLS policies for credits table
DROP POLICY IF EXISTS "Authenticated users can view credits" ON public.credits;
DROP POLICY IF EXISTS "Authenticated users can create credits" ON public.credits;
DROP POLICY IF EXISTS "Authenticated users can update credits" ON public.credits;
DROP POLICY IF EXISTS "Authenticated users can delete credits" ON public.credits;

CREATE POLICY "Users can view their team credits" ON public.credits
FOR SELECT USING (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can create credits" ON public.credits
FOR INSERT WITH CHECK (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can update their team credits" ON public.credits
FOR UPDATE USING (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can delete their team credits" ON public.credits
FOR DELETE USING (owner_id = public.get_owner_id(auth.uid()));

-- Step 6: Update RLS policies for credit_transactions table
DROP POLICY IF EXISTS "Authenticated users can view credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Authenticated users can create credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Authenticated users can update credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Authenticated users can delete credit transactions" ON public.credit_transactions;

CREATE POLICY "Users can view their team credit transactions" ON public.credit_transactions
FOR SELECT USING (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can create credit transactions" ON public.credit_transactions
FOR INSERT WITH CHECK (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can update their team credit transactions" ON public.credit_transactions
FOR UPDATE USING (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can delete their team credit transactions" ON public.credit_transactions
FOR DELETE USING (owner_id = public.get_owner_id(auth.uid()));

-- Step 7: Update RLS policies for payment_ledger table
DROP POLICY IF EXISTS "Authenticated users can view payment ledger" ON public.payment_ledger;
DROP POLICY IF EXISTS "Authenticated users can create payment ledger" ON public.payment_ledger;
DROP POLICY IF EXISTS "Authenticated users can update payment ledger" ON public.payment_ledger;
DROP POLICY IF EXISTS "Authenticated users can delete payment ledger" ON public.payment_ledger;

CREATE POLICY "Users can view their team payment ledger" ON public.payment_ledger
FOR SELECT USING (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can create payment ledger" ON public.payment_ledger
FOR INSERT WITH CHECK (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can update their team payment ledger" ON public.payment_ledger
FOR UPDATE USING (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can delete their team payment ledger" ON public.payment_ledger
FOR DELETE USING (owner_id = public.get_owner_id(auth.uid()));

-- Step 8: Update RLS policies for installments table
DROP POLICY IF EXISTS "Authenticated users can view installments" ON public.installments;
DROP POLICY IF EXISTS "Authenticated users can create installments" ON public.installments;
DROP POLICY IF EXISTS "Authenticated users can update installments" ON public.installments;
DROP POLICY IF EXISTS "Authenticated users can delete installments" ON public.installments;

CREATE POLICY "Users can view their team installments" ON public.installments
FOR SELECT USING (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can create installments" ON public.installments
FOR INSERT WITH CHECK (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can update their team installments" ON public.installments
FOR UPDATE USING (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can delete their team installments" ON public.installments
FOR DELETE USING (owner_id = public.get_owner_id(auth.uid()));

-- Step 9: Update RLS policies for installment_payments table
DROP POLICY IF EXISTS "Authenticated users can view installment payments" ON public.installment_payments;
DROP POLICY IF EXISTS "Authenticated users can create installment payments" ON public.installment_payments;
DROP POLICY IF EXISTS "Authenticated users can update installment payments" ON public.installment_payments;
DROP POLICY IF EXISTS "Authenticated users can delete installment payments" ON public.installment_payments;

CREATE POLICY "Users can view their team installment payments" ON public.installment_payments
FOR SELECT USING (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can create installment payments" ON public.installment_payments
FOR INSERT WITH CHECK (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can update their team installment payments" ON public.installment_payments
FOR UPDATE USING (owner_id = public.get_owner_id(auth.uid()));

CREATE POLICY "Users can delete their team installment payments" ON public.installment_payments
FOR DELETE USING (owner_id = public.get_owner_id(auth.uid()));

-- Step 10: Update RLS policies for sale_items (needs to check via sales table)
DROP POLICY IF EXISTS "Authenticated users can view sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can create sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can update sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can delete sale items" ON public.sale_items;

CREATE POLICY "Users can view their team sale items" ON public.sale_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.sales 
    WHERE sales.id = sale_items.sale_id 
    AND sales.owner_id = public.get_owner_id(auth.uid())
  )
);

CREATE POLICY "Users can create sale items" ON public.sale_items
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sales 
    WHERE sales.id = sale_items.sale_id 
    AND sales.owner_id = public.get_owner_id(auth.uid())
  )
);

CREATE POLICY "Users can update their team sale items" ON public.sale_items
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.sales 
    WHERE sales.id = sale_items.sale_id 
    AND sales.owner_id = public.get_owner_id(auth.uid())
  )
);

CREATE POLICY "Users can delete their team sale items" ON public.sale_items
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.sales 
    WHERE sales.id = sale_items.sale_id 
    AND sales.owner_id = public.get_owner_id(auth.uid())
  )
);