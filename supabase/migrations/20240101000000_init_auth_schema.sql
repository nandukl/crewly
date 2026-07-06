-- supabase/migrations/20240101000000_init_auth_schema.sql

-- 1. user_profiles
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  is_super_admin BOOLEAN DEFAULT FALSE NOT NULL,
  last_active_org_id UUID, -- For Module 1b
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. account_lockouts
CREATE TABLE public.account_lockouts (
  email TEXT PRIMARY KEY,
  failed_attempts INT DEFAULT 0 NOT NULL,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;
-- No RLS policies => completely private, only accessible via security definer functions

CREATE OR REPLACE FUNCTION public.check_lockout(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_locked_until TIMESTAMPTZ;
BEGIN
  SELECT locked_until INTO v_locked_until FROM public.account_lockouts WHERE email = p_email;
  IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.record_failed_login(p_email TEXT, p_max_attempts INT DEFAULT 5, p_lockout_minutes INT DEFAULT 15)
RETURNS VOID AS $$
DECLARE
  v_attempts INT;
BEGIN
  INSERT INTO public.account_lockouts (email, failed_attempts, updated_at)
  VALUES (p_email, 1, NOW())
  ON CONFLICT (email) DO UPDATE SET 
    failed_attempts = public.account_lockouts.failed_attempts + 1,
    updated_at = NOW()
  RETURNING failed_attempts INTO v_attempts;

  IF v_attempts >= p_max_attempts THEN
    UPDATE public.account_lockouts
    SET locked_until = NOW() + (p_lockout_minutes || ' minutes')::INTERVAL
    WHERE email = p_email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.reset_failed_login(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_email IS NOT NULL THEN
    UPDATE public.account_lockouts
    SET failed_attempts = 0, locked_until = NULL, updated_at = NOW()
    WHERE email = v_email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. user_sessions_tracker
CREATE TABLE public.user_sessions_tracker (
  session_id UUID PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  device_fingerprint TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  last_active TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.user_sessions_tracker ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own sessions" ON public.user_sessions_tracker FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.user_sessions_tracker FOR UPDATE USING (auth.uid() = user_id);
-- Allow inserts during login. We can allow authenticated inserts where user_id matches uid.
CREATE POLICY "Users can insert their own sessions" ON public.user_sessions_tracker FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. auth_audit_logs (Stub for Module 4)
CREATE TABLE public.auth_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.auth_audit_logs ENABLE ROW LEVEL SECURITY;
-- We need a security definer function to allow inserting audit logs, so normal users can't tamper with them.
CREATE OR REPLACE FUNCTION public.record_audit_log(p_event_type TEXT, p_user_id UUID, p_metadata JSONB DEFAULT '{}'::jsonb)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.auth_audit_logs (event_type, user_id, metadata)
  VALUES (p_event_type, p_user_id, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
