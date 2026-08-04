INSERT INTO public.admin_feature_overrides (admin_id, feature, can_view, can_create, can_edit, can_delete)
SELECT a.admin_id, 'credit_management',
  COALESCE(bool_or(a.can_view), true),
  COALESCE(bool_or(a.can_create), true),
  COALESCE(bool_or(a.can_edit), true),
  COALESCE(bool_or(a.can_delete), true)
FROM public.admin_feature_overrides a
WHERE a.feature IN ('credits','receive_payment','cash_credit')
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_feature_overrides b
    WHERE b.admin_id = a.admin_id AND b.feature = 'credit_management'
  )
GROUP BY a.admin_id;