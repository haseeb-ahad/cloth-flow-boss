-- Drop existing restrictive RLS policies and create shared access policies
-- This allows all authenticated users to access shared business data

-- PRODUCTS table
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
DROP POLICY IF EXISTS "Users can create own products" ON public.products;
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete own products" ON public.products;

CREATE POLICY "Authenticated users can view products" ON public.products
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create products" ON public.products
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update products" ON public.products
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete products" ON public.products
FOR DELETE TO authenticated USING (true);

-- SALES table
DROP POLICY IF EXISTS "Users can view own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can create own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can delete own sales" ON public.sales;

CREATE POLICY "Authenticated users can view sales" ON public.sales
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create sales" ON public.sales
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales" ON public.sales
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete sales" ON public.sales
FOR DELETE TO authenticated USING (true);

-- SALE_ITEMS table
DROP POLICY IF EXISTS "Users can view own sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Users can create own sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Users can update own sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Users can delete own sale items" ON public.sale_items;

CREATE POLICY "Authenticated users can view sale items" ON public.sale_items
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create sale items" ON public.sale_items
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update sale items" ON public.sale_items
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete sale items" ON public.sale_items
FOR DELETE TO authenticated USING (true);

-- CREDITS table
DROP POLICY IF EXISTS "Users can view own credits" ON public.credits;
DROP POLICY IF EXISTS "Users can create own credits" ON public.credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.credits;
DROP POLICY IF EXISTS "Users can delete own credits" ON public.credits;

CREATE POLICY "Authenticated users can view credits" ON public.credits
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create credits" ON public.credits
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update credits" ON public.credits
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete credits" ON public.credits
FOR DELETE TO authenticated USING (true);

-- CREDIT_TRANSACTIONS table
DROP POLICY IF EXISTS "Users can view own credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Users can create own credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Users can update own credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Users can delete own credit transactions" ON public.credit_transactions;

CREATE POLICY "Authenticated users can view credit transactions" ON public.credit_transactions
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create credit transactions" ON public.credit_transactions
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update credit transactions" ON public.credit_transactions
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete credit transactions" ON public.credit_transactions
FOR DELETE TO authenticated USING (true);

-- INSTALLMENTS table
DROP POLICY IF EXISTS "Users can view own installments" ON public.installments;
DROP POLICY IF EXISTS "Users can create own installments" ON public.installments;
DROP POLICY IF EXISTS "Users can update own installments" ON public.installments;
DROP POLICY IF EXISTS "Users can delete own installments" ON public.installments;

CREATE POLICY "Authenticated users can view installments" ON public.installments
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create installments" ON public.installments
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update installments" ON public.installments
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete installments" ON public.installments
FOR DELETE TO authenticated USING (true);

-- INSTALLMENT_PAYMENTS table
DROP POLICY IF EXISTS "Users can view own installment payments" ON public.installment_payments;
DROP POLICY IF EXISTS "Users can create own installment payments" ON public.installment_payments;
DROP POLICY IF EXISTS "Users can update own installment payments" ON public.installment_payments;
DROP POLICY IF EXISTS "Users can delete own installment payments" ON public.installment_payments;

CREATE POLICY "Authenticated users can view installment payments" ON public.installment_payments
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create installment payments" ON public.installment_payments
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update installment payments" ON public.installment_payments
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete installment payments" ON public.installment_payments
FOR DELETE TO authenticated USING (true);

-- PAYMENT_LEDGER table
DROP POLICY IF EXISTS "Users can view own payment ledger" ON public.payment_ledger;
DROP POLICY IF EXISTS "Users can create own payment ledger" ON public.payment_ledger;
DROP POLICY IF EXISTS "Users can update own payment ledger" ON public.payment_ledger;
DROP POLICY IF EXISTS "Users can delete own payment ledger" ON public.payment_ledger;

CREATE POLICY "Authenticated users can view payment ledger" ON public.payment_ledger
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create payment ledger" ON public.payment_ledger
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update payment ledger" ON public.payment_ledger
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete payment ledger" ON public.payment_ledger
FOR DELETE TO authenticated USING (true);