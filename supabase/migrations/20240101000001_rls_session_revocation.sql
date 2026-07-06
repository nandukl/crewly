-- supabase/migrations/20240101000001_rls_session_revocation.sql

-- Helper function or direct SQL logic to check if current session is revoked
-- Since auth.jwt() returns the JWT containing the 'session_id' claim natively for Supabase Auth,
-- we check the user_sessions_tracker for that session_id to ensure is_revoked = false.

-- 1. user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT 
USING (
  auth.uid() = id 
  AND NOT EXISTS (
    SELECT 1 FROM public.user_sessions_tracker 
    WHERE session_id = (auth.jwt()->>'session_id')::uuid 
    AND is_revoked = true
  )
);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE 
USING (
  auth.uid() = id 
  AND NOT EXISTS (
    SELECT 1 FROM public.user_sessions_tracker 
    WHERE session_id = (auth.jwt()->>'session_id')::uuid 
    AND is_revoked = true
  )
);

-- 2. user_sessions_tracker
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions_tracker;
CREATE POLICY "Users can view their own sessions" ON public.user_sessions_tracker FOR SELECT 
USING (
  auth.uid() = user_id 
  AND NOT EXISTS (
    SELECT 1 FROM public.user_sessions_tracker 
    WHERE session_id = (auth.jwt()->>'session_id')::uuid 
    AND is_revoked = true
  )
);

DROP POLICY IF EXISTS "Users can update their own sessions" ON public.user_sessions_tracker;
CREATE POLICY "Users can update their own sessions" ON public.user_sessions_tracker FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND NOT EXISTS (
    SELECT 1 FROM public.user_sessions_tracker 
    WHERE session_id = (auth.jwt()->>'session_id')::uuid 
    AND is_revoked = true
  )
);

-- Note: The INSERT policy for user_sessions_tracker must remain unaffected by the revocation check 
-- because it runs during the initial login before the session row is even created.
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.user_sessions_tracker;
CREATE POLICY "Users can insert their own sessions" ON public.user_sessions_tracker FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. auth_audit_logs
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.auth_audit_logs;
CREATE POLICY "Users can view their own audit logs" ON public.auth_audit_logs FOR SELECT 
USING (
  auth.uid() = user_id 
  AND NOT EXISTS (
    SELECT 1 FROM public.user_sessions_tracker 
    WHERE session_id = (auth.jwt()->>'session_id')::uuid 
    AND is_revoked = true
  )
);

-- (account_lockouts has no RLS policies; it is fully private and accessed via SECURITY DEFINER functions)
