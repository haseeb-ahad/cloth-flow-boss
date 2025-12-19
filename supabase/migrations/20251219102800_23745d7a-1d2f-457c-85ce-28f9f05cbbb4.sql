-- Create system settings table for superadmin configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default loader text setting
INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('loader_text', 'INVOICE')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read system settings (public config)
CREATE POLICY "Anyone can read system settings"
ON public.system_settings
FOR SELECT
USING (true);

-- Only allow super admin (via edge function) to modify
-- No direct update policy since superadmin uses service role

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();