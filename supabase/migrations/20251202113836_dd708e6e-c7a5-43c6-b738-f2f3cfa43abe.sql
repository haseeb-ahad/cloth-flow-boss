-- Update handle_new_user function to respect role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  selected_role app_role;
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, email, phone_number, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'full_name'
  );
  
  -- Determine role: use metadata role if provided, otherwise default to worker (first user gets admin)
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    selected_role := (NEW.raw_user_meta_data->>'role')::app_role;
  ELSIF (SELECT COUNT(*) FROM auth.users) = 1 THEN
    selected_role := 'admin'::app_role;
  ELSE
    selected_role := 'worker'::app_role;
  END IF;
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, selected_role);
  
  RETURN NEW;
END;
$function$;