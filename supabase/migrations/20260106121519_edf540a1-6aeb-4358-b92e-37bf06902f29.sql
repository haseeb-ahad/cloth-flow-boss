-- Create admin_presence table to track online/offline status
CREATE TABLE public.admin_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_presence ENABLE ROW LEVEL SECURITY;

-- Admins can update their own presence
CREATE POLICY "Admins can update their own presence"
ON public.admin_presence
FOR UPDATE
USING (admin_id = auth.uid());

-- Admins can insert their own presence
CREATE POLICY "Admins can insert their own presence"
ON public.admin_presence
FOR INSERT
WITH CHECK (admin_id = auth.uid());

-- Anyone authenticated can view presence (for super admin dashboard)
CREATE POLICY "Authenticated users can view presence"
ON public.admin_presence
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create function to automatically set offline if last_seen > 10 minutes
CREATE OR REPLACE FUNCTION public.check_admin_offline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admin_presence
  SET status = 'offline', updated_at = now()
  WHERE status = 'online'
    AND last_seen < now() - INTERVAL '10 minutes';
END;
$$;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_admin_presence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_admin_presence_updated_at
BEFORE UPDATE ON public.admin_presence
FOR EACH ROW
EXECUTE FUNCTION public.update_admin_presence_updated_at();

-- Enable realtime for admin_presence table
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_presence;