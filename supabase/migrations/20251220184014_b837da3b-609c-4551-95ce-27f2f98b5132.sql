-- Create trigger function to auto-delete credits when fully paid
CREATE OR REPLACE FUNCTION public.auto_delete_paid_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the credit record if remaining_amount is 0 or less
  IF NEW.remaining_amount <= 0 THEN
    DELETE FROM public.credits WHERE id = NEW.id;
    RETURN NULL; -- Prevent the update from completing since we deleted the row
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on credits table
DROP TRIGGER IF EXISTS trigger_auto_delete_paid_credits ON public.credits;
CREATE TRIGGER trigger_auto_delete_paid_credits
  AFTER UPDATE OF remaining_amount ON public.credits
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_delete_paid_credits();

-- Clean up existing paid credits (remaining_amount = 0)
DELETE FROM public.credits WHERE remaining_amount <= 0;

-- Clean up soft-deleted records permanently
DELETE FROM public.credits WHERE is_deleted = true OR deleted_at IS NOT NULL;
DELETE FROM public.sales WHERE is_deleted = true OR deleted_at IS NOT NULL;
DELETE FROM public.sale_items WHERE is_deleted = true OR deleted_at IS NOT NULL;
DELETE FROM public.products WHERE is_deleted = true OR deleted_at IS NOT NULL;
DELETE FROM public.expenses WHERE is_deleted = true OR deleted_at IS NOT NULL;
DELETE FROM public.installments WHERE is_deleted = true OR deleted_at IS NOT NULL;
DELETE FROM public.installment_payments WHERE is_deleted = true OR deleted_at IS NOT NULL;
DELETE FROM public.credit_transactions WHERE is_deleted = true OR deleted_at IS NOT NULL;
DELETE FROM public.payment_ledger WHERE is_deleted = true OR deleted_at IS NOT NULL;

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.credits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_items;