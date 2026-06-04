INSERT INTO public.admin_feature_overrides (admin_id, feature, can_view, can_create, can_edit, can_delete)
SELECT admin_id, 'credit_management', can_view, can_create, can_edit, can_delete
FROM public.admin_feature_overrides
WHERE feature = 'credits'
ON CONFLICT (admin_id, feature) DO NOTHING;

INSERT INTO public.worker_permissions (worker_id, feature, can_view, can_create, can_edit, can_delete)
SELECT worker_id, 'credit_management', can_view, can_create, can_edit, can_delete
FROM public.worker_permissions
WHERE feature = 'receive_payment'
ON CONFLICT (worker_id, feature) DO NOTHING;

DELETE FROM public.worker_permissions WHERE feature = 'receive_payment';