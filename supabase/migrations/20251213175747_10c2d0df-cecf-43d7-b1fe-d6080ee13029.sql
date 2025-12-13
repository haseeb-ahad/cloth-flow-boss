
-- Add is_deleted column to all data tables
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE credits ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE installment_payments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE payment_ledger ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Create indexes for is_deleted columns
CREATE INDEX IF NOT EXISTS idx_products_is_deleted ON products(is_deleted);
CREATE INDEX IF NOT EXISTS idx_sales_is_deleted ON sales(is_deleted);
CREATE INDEX IF NOT EXISTS idx_sale_items_is_deleted ON sale_items(is_deleted);
CREATE INDEX IF NOT EXISTS idx_credits_is_deleted ON credits(is_deleted);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_is_deleted ON credit_transactions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_expenses_is_deleted ON expenses(is_deleted);
CREATE INDEX IF NOT EXISTS idx_installments_is_deleted ON installments(is_deleted);
CREATE INDEX IF NOT EXISTS idx_installment_payments_is_deleted ON installment_payments(is_deleted);
CREATE INDEX IF NOT EXISTS idx_payment_ledger_is_deleted ON payment_ledger(is_deleted);

-- Update RLS policies to use is_deleted = false

-- Products
DROP POLICY IF EXISTS "Users can view their team products" ON products;
CREATE POLICY "Users can view their team products" ON products
FOR SELECT USING (owner_id = get_owner_id(auth.uid()) AND is_deleted = false);

-- Sales
DROP POLICY IF EXISTS "Users can view their team sales" ON sales;
CREATE POLICY "Users can view their team sales" ON sales
FOR SELECT USING (owner_id = get_owner_id(auth.uid()) AND is_deleted = false);

-- Sale Items
DROP POLICY IF EXISTS "Users can view their team sale items" ON sale_items;
CREATE POLICY "Users can view their team sale items" ON sale_items
FOR SELECT USING (
  is_deleted = false AND 
  EXISTS (
    SELECT 1 FROM sales 
    WHERE sales.id = sale_items.sale_id 
    AND sales.owner_id = get_owner_id(auth.uid()) 
    AND sales.is_deleted = false
  )
);

-- Credits
DROP POLICY IF EXISTS "Users can view their team credits" ON credits;
CREATE POLICY "Users can view their team credits" ON credits
FOR SELECT USING (owner_id = get_owner_id(auth.uid()) AND is_deleted = false);

-- Credit Transactions
DROP POLICY IF EXISTS "Users can view their team credit transactions" ON credit_transactions;
CREATE POLICY "Users can view their team credit transactions" ON credit_transactions
FOR SELECT USING (owner_id = get_owner_id(auth.uid()) AND is_deleted = false);

-- Expenses
DROP POLICY IF EXISTS "Users can view their team expenses" ON expenses;
CREATE POLICY "Users can view their team expenses" ON expenses
FOR SELECT USING (owner_id = get_owner_id(auth.uid()) AND is_deleted = false);

-- Installments
DROP POLICY IF EXISTS "Users can view their team installments" ON installments;
CREATE POLICY "Users can view their team installments" ON installments
FOR SELECT USING (owner_id = get_owner_id(auth.uid()) AND is_deleted = false);

-- Installment Payments
DROP POLICY IF EXISTS "Users can view their team installment payments" ON installment_payments;
CREATE POLICY "Users can view their team installment payments" ON installment_payments
FOR SELECT USING (owner_id = get_owner_id(auth.uid()) AND is_deleted = false);

-- Payment Ledger
DROP POLICY IF EXISTS "Users can view their team payment ledger" ON payment_ledger;
CREATE POLICY "Users can view their team payment ledger" ON payment_ledger
FOR SELECT USING (owner_id = get_owner_id(auth.uid()) AND is_deleted = false);
