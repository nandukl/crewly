-- supabase/migrations/20240101000002_fix_rls_recursion.sql

-- To avoid infinite recursion in RLS policies querying user_sessions_tracker,
-- we use a SECURITY DEFINER function to bypass RLS for the revocation check.

CREATE OR REPLACE FUNCTION public.is_session_revoked(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_revoked BOOLEAN;
BEGIN
  IF p_session_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT is_revoked INTO v_is_revoked 
  FROM public.user_sessions_tracker 
  WHERE session_id = p_session_id;
  
  RETURN COALESCE(v_is_revoked, FALSE);
END;
$$;

-- 1. user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT 
USING (
  auth.uid() = id 
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE 
USING (
  auth.uid() = id 
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- 2. user_sessions_tracker
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions_tracker;
CREATE POLICY "Users can view their own sessions" ON public.user_sessions_tracker FOR SELECT 
USING (
  auth.uid() = user_id 
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

DROP POLICY IF EXISTS "Users can update their own sessions" ON public.user_sessions_tracker;
CREATE POLICY "Users can update their own sessions" ON public.user_sessions_tracker FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- 3. auth_audit_logs
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.auth_audit_logs;
CREATE POLICY "Users can view their own audit logs" ON public.auth_audit_logs FOR SELECT 
USING (
  auth.uid() = user_id 
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);
