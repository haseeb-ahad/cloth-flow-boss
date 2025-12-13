-- Add deleted_at column to all data tables for soft delete

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.credits ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.installments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.installment_payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.payment_ledger ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create indexes for better performance on soft delete queries
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_sales_deleted_at ON public.sales(deleted_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_deleted_at ON public.sale_items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_credits_deleted_at ON public.credits(deleted_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_deleted_at ON public.credit_transactions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON public.expenses(deleted_at);
CREATE INDEX IF NOT EXISTS idx_installments_deleted_at ON public.installments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_installment_payments_deleted_at ON public.installment_payments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_payment_ledger_deleted_at ON public.payment_ledger(deleted_at);

-- Drop existing SELECT policies and recreate with soft delete filter

-- Products
DROP POLICY IF EXISTS "Users can view their team products" ON public.products;
CREATE POLICY "Users can view their team products" ON public.products
FOR SELECT USING (owner_id = get_owner_id(auth.uid()) AND deleted_at IS NULL);

-- Sales
DROP POLICY IF EXISTS "Users can view their team sales" ON public.sales;
CREATE POLICY "Users can view their team sales" ON public.sales
FOR SELECT USING (owner_id = get_owner_id(auth.uid()) AND deleted_at IS NULL);

-- Sale Items
DROP POLICY IF EXISTS "Users can view their team sale items" ON public.sale_items;
CREATE POLICY "Users can view their team sale items" ON public.sale_items
FOR SELECT USING (
  deleted_at IS NULL AND
  EXISTS (
    SELECT 1 FROM sales 
    WHERE sales.id = sale_items.sale_id 
    AND sales.owner_id = get_owner_id(auth.uid())
    AND sales.deleted_at IS NULL
  )
);

-- Credits
DROP POLICY IF EXISTS "Users can view their team credits" ON public.credits;
CREATE POLICY "Users can view their team credits" ON public.credits
FOR SELECT USING (owner_id = get_owner_id(auth.uid()) AND deleted_at IS NULL);

-- Credit Transactions
DROP POLICY IF EXISTS "Users can view their team credit transactions" ON public.credit_transactions;
CREATE POLICY "Users can view their team credit transactions" ON public.credit_transactions
FOR SELECT USING (owner_id = get_owner_id(auth.uid()) AND deleted_at IS NULL);

-- Expenses
DROP POLICY IF EXISTS "Users can view their team expenses" ON public.expenses;
CREATE POLICY "Users can view their team expenses" ON public.expenses
FOR SELECT USING (owner_id = get_owner_id(auth.uid()) AND deleted_at IS NULL);

-- Installments
DROP POLICY IF EXISTS "Users can view their team installments" ON public.installments;
CREATE POLICY "Users can view their team installments" ON public.installments
FOR SELECT USING (owner_id = get_owner_id(auth.uid()) AND deleted_at IS NULL);

-- Installment Payments
DROP POLICY IF EXISTS "Users can view their team installment payments" ON public.installment_payments;
CREATE POLICY "Users can view their team installment payments" ON public.installment_payments
FOR SELECT USING (owner_id = get_owner_id(auth.uid()) AND deleted_at IS NULL);

-- Payment Ledger
DROP POLICY IF EXISTS "Users can view their team payment ledger" ON public.payment_ledger;
CREATE POLICY "Users can view their team payment ledger" ON public.payment_ledger
FOR SELECT USING (owner_id = get_owner_id(auth.uid()) AND deleted_at IS NULL);