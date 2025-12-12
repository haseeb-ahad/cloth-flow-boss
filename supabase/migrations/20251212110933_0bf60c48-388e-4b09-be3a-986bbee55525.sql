-- Fix RLS policy for user_roles to ensure admin isolation
-- Each admin should only see their own workers, not workers of other admins

-- Drop the old "Admins can view all roles" policy which allows cross-admin visibility
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Create new policy: Admins can view their own role and roles of workers they created
CREATE POLICY "Admins can view their team roles" 
ON public.user_roles 
FOR SELECT 
USING (
  -- User can see their own role
  auth.uid() = user_id 
  OR 
  -- Admins can see workers they created (where admin_id = their user_id)
  (is_admin(auth.uid()) AND admin_id = auth.uid())
);

-- Update the insert policy to set admin_id automatically for workers
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles for their workers" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  is_admin(auth.uid()) AND 
  (admin_id = auth.uid() OR admin_id IS NULL)
);

-- Update policy ensures admins can only update their own workers' roles
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;

CREATE POLICY "Admins can update their team roles" 
ON public.user_roles 
FOR UPDATE 
USING (
  is_admin(auth.uid()) AND 
  (admin_id = auth.uid() OR user_id = auth.uid())
);

-- Delete policy ensures admins can only delete their own workers' roles  
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can delete their team roles" 
ON public.user_roles 
FOR DELETE 
USING (
  is_admin(auth.uid()) AND admin_id = auth.uid()
);