-- Password History Table (stores hashed previous passwords)
CREATE TABLE public.password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_password_history_user_id ON public.password_history(user_id);

-- Enable RLS
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- Only service role can access password history (no direct user access)
CREATE POLICY "Service role only" ON public.password_history
    FOR ALL USING (false);

-- Password Policy Settings (Super Admin configurable)
CREATE TABLE public.password_policy_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_length INTEGER NOT NULL DEFAULT 8,
    max_length INTEGER NOT NULL DEFAULT 128,
    require_uppercase BOOLEAN NOT NULL DEFAULT true,
    require_lowercase BOOLEAN NOT NULL DEFAULT true,
    require_number BOOLEAN NOT NULL DEFAULT true,
    require_special_char BOOLEAN NOT NULL DEFAULT true,
    special_chars TEXT NOT NULL DEFAULT '!@#$%^&*',
    password_history_count INTEGER NOT NULL DEFAULT 3,
    password_expiry_days INTEGER DEFAULT NULL,
    force_reset_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_policy_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read policy settings
CREATE POLICY "Anyone can read password policy" ON public.password_policy_settings
    FOR SELECT USING (true);

-- Insert default policy settings
INSERT INTO public.password_policy_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001');

-- Password Audit Log (for security tracking)
CREATE TABLE public.password_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'password_changed', 'password_reset_requested', 'password_reset_completed', 'failed_password_change'
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_password_audit_log_user_id ON public.password_audit_log(user_id);
CREATE INDEX idx_password_audit_log_created_at ON public.password_audit_log(created_at);

-- Enable RLS
ALTER TABLE public.password_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit logs
CREATE POLICY "Users can view own audit logs" ON public.password_audit_log
    FOR SELECT USING (auth.uid() = user_id);

-- Password Reset Tokens (secure one-time tokens)
CREATE TABLE public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access reset tokens
CREATE POLICY "Service role only" ON public.password_reset_tokens
    FOR ALL USING (false);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_password_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.password_reset_tokens
    WHERE expires_at < now() OR used_at IS NOT NULL;
END;
$$;

-- Trigger to update timestamp
CREATE OR REPLACE FUNCTION public.update_password_policy_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_password_policy_updated_at
    BEFORE UPDATE ON public.password_policy_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_password_policy_timestamp();