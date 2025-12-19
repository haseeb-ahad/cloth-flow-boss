-- Update handle_new_user function to create 7-day trial subscription for new admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
DECLARE
  selected_role app_role;
  is_first_user boolean;
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, email, phone_number, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'full_name'
  );
  
  -- Check if this is the first user
  is_first_user := (SELECT COUNT(*) FROM auth.users) = 1;
  
  -- Determine role: use metadata role if provided, otherwise default to worker (first user gets admin)
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    selected_role := (NEW.raw_user_meta_data->>'role')::app_role;
  ELSIF is_first_user THEN
    selected_role := 'admin'::app_role;
  ELSE
    selected_role := 'worker'::app_role;
  END IF;
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, selected_role);
  
  -- If user is admin, create 7-day free trial subscription
  IF selected_role = 'admin' THEN
    INSERT INTO public.subscriptions (
      admin_id,
      plan_id,
      start_date,
      end_date,
      status,
      is_trial,
      billing_cycle,
      amount_paid
    )
    VALUES (
      NEW.id,
      NULL, -- No specific plan during trial
      NOW(),
      NOW() + INTERVAL '7 days',
      'active',
      true,
      'trial',
      0
    );
    
    -- Also create app_settings for the new admin
    INSERT INTO public.app_settings (owner_id)
    VALUES (NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;