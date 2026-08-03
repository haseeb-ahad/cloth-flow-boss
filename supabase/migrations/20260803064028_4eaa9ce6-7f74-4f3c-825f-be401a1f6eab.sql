-- 1) Add WITH CHECK to tenant UPDATE policies
DROP POLICY IF EXISTS "Users can update their team sales" ON public.sales;
CREATE POLICY "Users can update their team sales" ON public.sales FOR UPDATE
USING (owner_id = get_owner_id(auth.uid())) WITH CHECK (owner_id = get_owner_id(auth.uid()));

DROP POLICY IF EXISTS "Users can update their team credits" ON public.credits;
CREATE POLICY "Users can update their team credits" ON public.credits FOR UPDATE
USING (owner_id = get_owner_id(auth.uid())) WITH CHECK (owner_id = get_owner_id(auth.uid()));

DROP POLICY IF EXISTS "Users can update their team credit transactions" ON public.credit_transactions;
CREATE POLICY "Users can update their team credit transactions" ON public.credit_transactions FOR UPDATE
USING (owner_id = get_owner_id(auth.uid())) WITH CHECK (owner_id = get_owner_id(auth.uid()));

DROP POLICY IF EXISTS "Users can update their team expenses" ON public.expenses;
CREATE POLICY "Users can update their team expenses" ON public.expenses FOR UPDATE
USING (owner_id = get_owner_id(auth.uid())) WITH CHECK (owner_id = get_owner_id(auth.uid()));

DROP POLICY IF EXISTS "Users can update their team installments" ON public.installments;
CREATE POLICY "Users can update their team installments" ON public.installments FOR UPDATE
USING (owner_id = get_owner_id(auth.uid())) WITH CHECK (owner_id = get_owner_id(auth.uid()));

DROP POLICY IF EXISTS "Users can update their team installment payments" ON public.installment_payments;
CREATE POLICY "Users can update their team installment payments" ON public.installment_payments FOR UPDATE
USING (owner_id = get_owner_id(auth.uid())) WITH CHECK (owner_id = get_owner_id(auth.uid()));

DROP POLICY IF EXISTS "Users can update their team payment ledger" ON public.payment_ledger;
CREATE POLICY "Users can update their team payment ledger" ON public.payment_ledger FOR UPDATE
USING (owner_id = get_owner_id(auth.uid())) WITH CHECK (owner_id = get_owner_id(auth.uid()));

DROP POLICY IF EXISTS "Users can update their team products" ON public.products;
CREATE POLICY "Users can update their team products" ON public.products FOR UPDATE
USING (owner_id = get_owner_id(auth.uid())) WITH CHECK (owner_id = get_owner_id(auth.uid()));

DROP POLICY IF EXISTS "Users can update their team customers" ON public.customers;
CREATE POLICY "Users can update their team customers" ON public.customers FOR UPDATE
USING (owner_id = get_owner_id(auth.uid())) WITH CHECK (owner_id = get_owner_id(auth.uid()));

-- 2) Scope payment-images uploads to the uploader's own / tenant folder
DROP POLICY IF EXISTS "Authenticated users can upload payment images" ON storage.objects;
CREATE POLICY "Authenticated users can upload payment images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-images'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR (storage.foldername(name))[1] = (get_owner_id(auth.uid()))::text
  )
);

-- Allow tenant members to manage files in their tenant folder as well
DROP POLICY IF EXISTS "Users can update their own payment images" ON storage.objects;
CREATE POLICY "Users can update their own payment images" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'payment-images'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR (storage.foldername(name))[1] = (get_owner_id(auth.uid()))::text
  )
);

DROP POLICY IF EXISTS "Users can delete their own payment images" ON storage.objects;
CREATE POLICY "Users can delete their own payment images" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payment-images'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR (storage.foldername(name))[1] = (get_owner_id(auth.uid()))::text
  )
);
