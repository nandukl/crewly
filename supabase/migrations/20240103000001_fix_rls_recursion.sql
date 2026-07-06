-- STEP 2.1: Turn off FORCE ROW LEVEL SECURITY on memberships
ALTER TABLE public.memberships NO FORCE ROW LEVEL SECURITY;

-- STEP 2.2: Rebuild functions as SECURITY DEFINER owned by postgres with row_security = off

-- 1. has_active_membership
CREATE OR REPLACE FUNCTION public.has_active_membership(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = p_org_id AND user_id = auth.uid() AND status = 'active'
  );
$$;
ALTER FUNCTION public.has_active_membership(UUID) OWNER TO postgres;

-- 2. is_org_admin
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = p_org_id AND user_id = auth.uid() AND role IN ('owner', 'org_admin') AND status = 'active'
  );
$$;
ALTER FUNCTION public.is_org_admin(UUID) OWNER TO postgres;

-- 3. is_session_revoked
CREATE OR REPLACE FUNCTION public.is_session_revoked(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_sessions_tracker
    WHERE session_id = p_session_id AND is_revoked = true
  );
$$;
ALTER FUNCTION public.is_session_revoked(UUID) OWNER TO postgres;


-- STEP 2.3: Restore memberships policies to normal function calls
DROP POLICY IF EXISTS "Users can view memberships in their orgs" ON public.memberships;
DROP POLICY IF EXISTS "Owners and Admins can manage memberships" ON public.memberships;

CREATE POLICY "Users can view memberships in their orgs" ON public.memberships FOR SELECT
USING (
  (public.has_active_membership(organization_id) OR user_id = auth.uid() OR email = auth.jwt()->>'email')
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Owners and Admins can manage memberships" ON public.memberships FOR ALL
USING (
  public.is_org_admin(organization_id) AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
)
WITH CHECK (
  public.is_org_admin(organization_id) AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);
