-- FULL SCHEMA SNAPSHOT (Aggregated from local migrations)

-- ==========================================
-- MIGRATION: 20240101000000_init_auth_schema.sql
-- ==========================================

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


-- ==========================================
-- MIGRATION: 20240101000001_rls_session_revocation.sql
-- ==========================================

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


-- ==========================================
-- MIGRATION: 20240101000002_fix_rls_recursion.sql
-- ==========================================

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


-- ==========================================
-- MIGRATION: 20240102000000_org_management_schema.sql
-- ==========================================

-- supabase/migrations/20240102000000_org_management_schema.sql

-- To avoid infinite recursion in RLS policies querying user_sessions_tracker,
-- we use the SECURITY DEFINER function is_session_revoked to bypass RLS for the revocation check.
-- This convention must be maintained across all future RLS policies.

CREATE TYPE public.organization_status AS ENUM ('active', 'archived');
CREATE TYPE public.membership_role AS ENUM ('owner', 'org_admin', 'app_admin', 'manager', 'employee');
CREATE TYPE public.membership_status AS ENUM ('pending_invitation', 'active', 'suspended', 'removed');
CREATE TYPE public.structure_node_type AS ENUM ('branch', 'department', 'team', 'business_unit');

-- 1. organizations
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
    logo_url TEXT,
    industry TEXT,
    size TEXT,
    locale TEXT,
    timezone TEXT,
    currency TEXT,
    status public.organization_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. memberships
CREATE TABLE public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id), -- Nullable for pending invites without accounts
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    email TEXT NOT NULL,
    role public.membership_role NOT NULL,
    status public.membership_status NOT NULL DEFAULT 'pending_invitation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, email)
);

-- 3. structure_nodes
CREATE TABLE public.structure_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    parent_id UUID REFERENCES public.structure_nodes(id),
    name TEXT NOT NULL,
    type public.structure_node_type NOT NULL,
    status public.organization_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, parent_id, name)
);

-- 4. org_module_activations
CREATE TABLE public.org_module_activations (
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    module_key TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (organization_id, module_key)
);

-- RLS POLICIES

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.structure_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_module_activations ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has active membership in an org
CREATE OR REPLACE FUNCTION public.has_active_membership(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = p_org_id
    AND user_id = auth.uid()
    AND status = 'active'
  );
$$;

-- Helper function to check if user is owner or org_admin
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE organization_id = p_org_id
    AND user_id = auth.uid()
    AND status = 'active'
    AND role IN ('owner', 'org_admin')
  );
$$;

-- organizations RLS
CREATE POLICY "Users can view orgs they are members of" ON public.organizations FOR SELECT 
USING (
  public.has_active_membership(id)
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Owners and Admins can update org" ON public.organizations FOR UPDATE 
USING (
  public.is_org_admin(id)
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Users can create org" ON public.organizations FOR INSERT 
WITH CHECK (
  NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- memberships RLS
CREATE POLICY "Users can view memberships in their orgs" ON public.memberships FOR SELECT 
USING (
  (public.has_active_membership(organization_id) OR user_id = auth.uid() OR email = auth.jwt()->>'email')
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Owners and Admins can manage memberships" ON public.memberships FOR ALL
USING (
  public.is_org_admin(organization_id)
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
)
WITH CHECK (
  public.is_org_admin(organization_id)
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- Since users create their own initial membership when creating an org, they need insert access for their own user_id temporarily.
CREATE POLICY "Users can insert their own owner membership" ON public.memberships FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  AND role = 'owner'
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);


-- structure_nodes RLS
CREATE POLICY "Users can view structure in their orgs" ON public.structure_nodes FOR SELECT 
USING (
  public.has_active_membership(organization_id)
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Owners and Admins can manage structure" ON public.structure_nodes FOR ALL
USING (
  public.is_org_admin(organization_id)
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
)
WITH CHECK (
  public.is_org_admin(organization_id)
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- org_module_activations RLS
CREATE POLICY "Users can view module activations in their orgs" ON public.org_module_activations FOR SELECT 
USING (
  public.has_active_membership(organization_id)
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);


-- Stored Procedure for Atomic Ownership Transfer
CREATE OR REPLACE FUNCTION public.transfer_org_ownership(p_org_id UUID, p_new_owner_membership_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoker_membership_id UUID;
    v_invoker_role public.membership_role;
    v_target_status public.membership_status;
    v_target_user_id UUID;
    v_invoker_user_id UUID;
BEGIN
    v_invoker_user_id := auth.uid();
    
    -- Check if invoker is current owner
    SELECT id, role INTO v_invoker_membership_id, v_invoker_role
    FROM public.memberships
    WHERE organization_id = p_org_id AND user_id = v_invoker_user_id AND status = 'active';

    IF NOT FOUND OR v_invoker_role != 'owner' THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only the active owner can transfer ownership.';
    END IF;

    -- Check if target is an active member with a verified user
    SELECT status, user_id INTO v_target_status, v_target_user_id
    FROM public.memberships
    WHERE id = p_new_owner_membership_id AND organization_id = p_org_id;

    IF NOT FOUND OR v_target_status != 'active' OR v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_TARGET: Target must be an active, verified member.';
    END IF;
    
    IF v_invoker_membership_id = p_new_owner_membership_id THEN
        RAISE EXCEPTION 'INVALID_TARGET: Cannot transfer ownership to self.';
    END IF;

    -- Perform atomic transfer
    -- 1. Demote current owner
    UPDATE public.memberships 
    SET role = 'org_admin', updated_at = NOW()
    WHERE id = v_invoker_membership_id;

    -- 2. Promote new owner
    UPDATE public.memberships 
    SET role = 'owner', updated_at = NOW()
    WHERE id = p_new_owner_membership_id;
    
    -- Write Audit Log
    INSERT INTO public.auth_audit_logs (user_id, event_type, metadata)
    VALUES (
        v_invoker_user_id, 
        'OWNERSHIP_TRANSFERRED', 
        jsonb_build_object(
            'organization_id', p_org_id, 
            'previous_owner', v_invoker_membership_id, 
            'new_owner', p_new_owner_membership_id
        )
    );

END;
$$;

-- Add block for owner self-removal
CREATE OR REPLACE FUNCTION public.block_owner_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'removed' AND OLD.role = 'owner' THEN
        RAISE EXCEPTION 'INVALID_OPERATION: Cannot remove the owner. Transfer ownership first.';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER block_owner_removal_trigger
BEFORE UPDATE ON public.memberships
FOR EACH ROW
EXECUTE FUNCTION public.block_owner_removal();

-- Add last_active_org_id to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_active_org_id UUID REFERENCES public.organizations(id);


-- ==========================================
-- MIGRATION: 20240102000001_org_creation_rpc.sql
-- ==========================================

-- supabase/migrations/20240102000001_org_creation_rpc.sql

-- 1. Add structure_node_id to memberships to allow assignment to nodes
ALTER TABLE public.memberships ADD COLUMN structure_node_id UUID REFERENCES public.structure_nodes(id);

-- 2. Stored Procedure for Atomic Organization Creation
CREATE OR REPLACE FUNCTION public.create_organization(
    p_org_id UUID,
    p_name TEXT,
    p_slug TEXT,
    p_user_id UUID,
    p_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert the organization
    INSERT INTO public.organizations (id, name, slug, status, created_at, updated_at)
    VALUES (p_org_id, p_name, p_slug, 'active', NOW(), NOW());

    -- Insert the owner membership
    INSERT INTO public.memberships (organization_id, user_id, email, role, status, created_at, updated_at)
    VALUES (p_org_id, p_user_id, p_email, 'owner', 'active', NOW(), NOW());

    -- Update the user profile last_active_org_id
    UPDATE public.user_profiles
    SET last_active_org_id = p_org_id
    WHERE id = p_user_id;

    -- Write Audit Log
    INSERT INTO public.auth_audit_logs (user_id, event_type, metadata)
    VALUES (
        p_user_id, 
        'ORG_CREATED', 
        jsonb_build_object(
            'organization_id', p_org_id, 
            'name', p_name, 
            'slug', p_slug
        )
    );
END;
$$;


-- ==========================================
-- MIGRATION: 20240102000002_dev_email_log.sql
-- ==========================================

-- Create table for development email logging
CREATE TABLE IF NOT EXISTS public.dev_email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    verification_link TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (default deny all for public access)
ALTER TABLE public.dev_email_logs ENABLE ROW LEVEL SECURITY;

-- Allow admin access (Service Role)
CREATE POLICY "Allow service role access to dev_email_logs" 
ON public.dev_email_logs 
AS PERMISSIVE FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);


-- ==========================================
-- MIGRATION: 20240103000000_rbac_schema.sql
-- ==========================================

-- supabase/migrations/20240103000000_rbac_schema.sql

-- 1. custom_roles
CREATE TABLE public.custom_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- 2. permission_grants
CREATE TABLE public.permission_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custom_role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL,
    action TEXT NOT NULL,
    is_allowed BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(custom_role_id, resource_type, action)
);

-- 3. membership_custom_roles
CREATE TABLE public.membership_custom_roles (
    membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
    custom_role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(membership_id, custom_role_id)
);

-- RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_custom_roles ENABLE ROW LEVEL SECURITY;

-- custom_roles RLS
CREATE POLICY "Users can view custom roles in their orgs" ON public.custom_roles FOR SELECT 
USING (
  public.has_active_membership(organization_id)
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- (Removed FOR ALL policies for custom_roles and permission_grants to enforce RPC-only writes)

-- permission_grants RLS (via join to custom_roles)
CREATE POLICY "Users can view permission grants in their orgs" ON public.permission_grants FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.custom_roles cr 
    WHERE cr.id = custom_role_id AND public.has_active_membership(cr.organization_id)
  )
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- (Removed FOR ALL policies for permission_grants to enforce RPC-only writes)

-- membership_custom_roles RLS
CREATE POLICY "Users can view custom role assignments in their orgs" ON public.membership_custom_roles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m 
    WHERE m.id = membership_id AND public.has_active_membership(m.organization_id)
  )
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- (Removed FOR ALL policies for membership_custom_roles to enforce RPC-only writes)

-- No-Empty-Drafts Deferred Constraint Trigger
CREATE OR REPLACE FUNCTION public.check_role_has_grants()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_role_id UUID;
    v_count INT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_role_id := OLD.custom_role_id;
    ELSIF TG_OP IN ('INSERT', 'UPDATE') THEN
        IF TG_TABLE_NAME = 'custom_roles' THEN
            v_role_id := NEW.id;
        ELSE
            v_role_id := NEW.custom_role_id;
        END IF;
    END IF;

    -- If a role is being deleted entirely, the trigger on permission_grants will fire.
    -- We should skip the check if the role itself no longer exists (ON DELETE CASCADE).
    IF NOT EXISTS (SELECT 1 FROM public.custom_roles WHERE id = v_role_id) THEN
        RETURN NULL;
    END IF;

    SELECT COUNT(*) INTO v_count FROM public.permission_grants WHERE custom_role_id = v_role_id;
    
    IF v_count = 0 THEN
        RAISE EXCEPTION 'NO_EMPTY_DRAFTS: A custom role must have at least one permission grant.';
    END IF;

    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER check_custom_role_grants_trigger
AFTER INSERT ON public.custom_roles
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_role_has_grants();

CREATE CONSTRAINT TRIGGER check_permission_grant_deletion_trigger
AFTER DELETE OR UPDATE ON public.permission_grants
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_role_has_grants();


-- Central `has_permission` check function
CREATE OR REPLACE FUNCTION public.has_permission(p_user_id UUID, p_org_id UUID, p_resource_type TEXT, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_super_admin BOOLEAN;
    v_membership_id UUID;
    v_coarse_role public.membership_role;
    v_deny_count INT;
    v_allow_count INT;
BEGIN
    -- 1. Super Admin bypass (Hardcoded)
    SELECT is_super_admin INTO v_is_super_admin FROM public.user_profiles WHERE id = p_user_id;
    IF v_is_super_admin THEN
        RETURN TRUE;
    END IF;

    -- 2. Check active membership & coarse role
    SELECT id, role INTO v_membership_id, v_coarse_role
    FROM public.memberships
    WHERE user_id = p_user_id AND organization_id = p_org_id AND status = 'active';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- 3. Custom Grants (Deny Wins)
    SELECT COUNT(*) INTO v_deny_count
    FROM public.membership_custom_roles mcr
    JOIN public.permission_grants pg ON mcr.custom_role_id = pg.custom_role_id
    WHERE mcr.membership_id = v_membership_id
      AND pg.resource_type = p_resource_type
      AND pg.action = p_action
      AND pg.is_allowed = false;

    IF v_deny_count > 0 THEN
        RETURN FALSE;
    END IF;

    SELECT COUNT(*) INTO v_allow_count
    FROM public.membership_custom_roles mcr
    JOIN public.permission_grants pg ON mcr.custom_role_id = pg.custom_role_id
    WHERE mcr.membership_id = v_membership_id
      AND pg.resource_type = p_resource_type
      AND pg.action = p_action
      AND pg.is_allowed = true;

    IF v_allow_count > 0 THEN
        RETURN TRUE;
    END IF;

    -- 4. Implicit Coarse Role Defaults
    IF v_coarse_role IN ('owner', 'org_admin', 'app_admin') THEN
        RETURN TRUE;
    END IF;

    IF p_action = 'view' THEN
        IF v_coarse_role IN ('manager', 'employee') THEN 
            RETURN TRUE; 
        END IF;
    END IF;

    -- Fail Closed
    RETURN FALSE;
END;
$$;


-- Atomic Create Custom Role RPC
CREATE OR REPLACE FUNCTION public.create_custom_role(
    p_org_id UUID, 
    p_name TEXT, 
    p_description TEXT, 
    p_grants JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role_id UUID;
    v_grant JSONB;
BEGIN
    IF NOT public.is_org_admin(p_org_id) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only Owners and Admins can create roles.';
    END IF;

    INSERT INTO public.custom_roles (organization_id, name, description)
    VALUES (p_org_id, p_name, p_description)
    RETURNING id INTO v_role_id;

    FOR v_grant IN SELECT * FROM jsonb_array_elements(p_grants)
    LOOP
        INSERT INTO public.permission_grants (custom_role_id, resource_type, action, is_allowed)
        VALUES (
            v_role_id, 
            v_grant->>'resource_type', 
            v_grant->>'action', 
            (v_grant->>'is_allowed')::BOOLEAN
        );
    END LOOP;

    INSERT INTO public.auth_audit_logs (user_id, event_type, metadata)
    VALUES (
        auth.uid(), 
        'CUSTOM_ROLE_CREATED', 
        jsonb_build_object('organization_id', p_org_id, 'role_id', v_role_id, 'name', p_name)
    );

    RETURN v_role_id;
END;
$$;


-- Atomic Update Custom Role RPC
CREATE OR REPLACE FUNCTION public.update_custom_role(
    p_org_id UUID, 
    p_role_id UUID,
    p_name TEXT, 
    p_description TEXT, 
    p_grants JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_grant JSONB;
BEGIN
    IF NOT public.is_org_admin(p_org_id) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only Owners and Admins can update roles.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.custom_roles WHERE id = p_role_id AND organization_id = p_org_id) THEN
        RAISE EXCEPTION 'NOT_FOUND: Role does not exist or belong to this org.';
    END IF;

    UPDATE public.custom_roles 
    SET name = p_name, description = p_description, updated_at = NOW()
    WHERE id = p_role_id;

    -- Re-create grants
    DELETE FROM public.permission_grants WHERE custom_role_id = p_role_id;

    FOR v_grant IN SELECT * FROM jsonb_array_elements(p_grants)
    LOOP
        INSERT INTO public.permission_grants (custom_role_id, resource_type, action, is_allowed)
        VALUES (
            p_role_id, 
            v_grant->>'resource_type', 
            v_grant->>'action', 
            (v_grant->>'is_allowed')::BOOLEAN
        );
    END LOOP;

    INSERT INTO public.auth_audit_logs (user_id, event_type, metadata)
    VALUES (
        auth.uid(), 
        'CUSTOM_ROLE_UPDATED', 
        jsonb_build_object('organization_id', p_org_id, 'role_id', p_role_id)
    );
END;
$$;


-- Atomic Delete Custom Role RPC
CREATE OR REPLACE FUNCTION public.delete_custom_role(
    p_org_id UUID, 
    p_role_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT public.is_org_admin(p_org_id) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only Owners and Admins can delete roles.';
    END IF;
    
    -- Check if actively assigned
    IF EXISTS (SELECT 1 FROM public.membership_custom_roles WHERE custom_role_id = p_role_id) THEN
        RAISE EXCEPTION 'INVALID_OPERATION: Cannot delete a custom role that is actively assigned to memberships.';
    END IF;

    DELETE FROM public.custom_roles WHERE id = p_role_id AND organization_id = p_org_id;

    IF FOUND THEN
        INSERT INTO public.auth_audit_logs (user_id, event_type, metadata)
        VALUES (
            auth.uid(), 
            'CUSTOM_ROLE_DELETED', 
            jsonb_build_object('organization_id', p_org_id, 'role_id', p_role_id)
        );
    END IF;
END;
$$;


-- Atomic Assign Custom Roles RPC
CREATE OR REPLACE FUNCTION public.assign_membership_roles(
    p_org_id UUID, 
    p_membership_id UUID,
    p_custom_role_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role_id UUID;
BEGIN
    IF NOT public.is_org_admin(p_org_id) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only Owners and Admins can assign roles.';
    END IF;
    
    -- Ensure membership belongs to org
    IF NOT EXISTS (SELECT 1 FROM public.memberships WHERE id = p_membership_id AND organization_id = p_org_id) THEN
        RAISE EXCEPTION 'INVALID_OPERATION: Membership does not belong to this organization.';
    END IF;

    -- Delete all current assignments for this membership
    DELETE FROM public.membership_custom_roles WHERE membership_id = p_membership_id;

    -- Insert new assignments
    IF array_length(p_custom_role_ids, 1) > 0 THEN
        FOREACH v_role_id IN ARRAY p_custom_role_ids
        LOOP
            -- Ensure role belongs to org
            IF NOT EXISTS (SELECT 1 FROM public.custom_roles WHERE id = v_role_id AND organization_id = p_org_id) THEN
                RAISE EXCEPTION 'INVALID_OPERATION: Custom role does not belong to this organization.';
            END IF;
            
            INSERT INTO public.membership_custom_roles (membership_id, custom_role_id)
            VALUES (p_membership_id, v_role_id);
        END LOOP;
    END IF;

    INSERT INTO public.auth_audit_logs (user_id, event_type, metadata)
    VALUES (
        auth.uid(), 
        'MEMBERSHIP_ROLES_UPDATED', 
        jsonb_build_object('organization_id', p_org_id, 'membership_id', p_membership_id, 'new_roles', p_custom_role_ids)
    );
END;
$$;


-- ==========================================
-- MIGRATION: 20240103000001_fix_rls_recursion.sql
-- ==========================================

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


-- ==========================================
-- MIGRATION: 20240104000000_billing_stub_schema.sql
-- ==========================================

-- supabase/migrations/20240104000000_billing_stub_schema.sql

-- 1. Create subscription_status enum
CREATE TYPE public.subscription_status AS ENUM ('trial', 'grace_period', 'locked', 'active');

-- 2. Create subscriptions table (STUB)
CREATE TABLE public.subscriptions (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    status public.subscription_status NOT NULL DEFAULT 'trial',
    trial_started_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    grace_ends_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.user_profiles(id)
);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subscription status in their orgs" ON public.subscriptions FOR SELECT 
USING (
  public.has_active_membership(organization_id)
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Super Admins can update subscriptions" ON public.subscriptions FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_super_admin = true)
);

-- (No INSERT or DELETE policies - insertions happen atomically via SECURITY DEFINER, deletions cascade)

-- 3. check_subscription_access RPC
-- Future modules will call this exact signature from RLS to check access.
CREATE OR REPLACE FUNCTION public.check_subscription_access(p_org_id UUID, p_module_key TEXT, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status public.subscription_status;
BEGIN
    -- Exemption 1: Auth checks (if they ever pass 'auth' as a module) are never gated.
    IF p_module_key = 'auth' THEN
        RETURN TRUE;
    END IF;

    -- Exemption 2: Billing Visibility. 
    -- We explicitly require p_action = 'view' so that future billing writes (e.g., payment method updates) 
    -- remain subject to locking if the real module decides they should be.
    IF p_module_key = 'billing' AND p_action = 'view' THEN
        RETURN TRUE;
    END IF;

    -- Get the org's current subscription status
    SELECT status INTO v_status 
    FROM public.subscriptions 
    WHERE organization_id = p_org_id;

    -- If no subscription row exists (should be impossible due to atomic creation, but fail closed just in case)
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Evaluate based on status
    IF v_status IN ('trial', 'active') THEN
        RETURN TRUE;
    END IF;

    IF v_status = 'grace_period' THEN
        -- Grace period is read-only
        IF p_action = 'view' THEN
            RETURN TRUE;
        END IF;
        RETURN FALSE;
    END IF;

    IF v_status = 'locked' THEN
        -- Locked orgs have no access (exemptions handled above)
        RETURN FALSE;
    END IF;

    -- Fail closed
    RETURN FALSE;
END;
$$;


-- 4. Overwrite create_organization from 1b to atomically include a trial subscription.
-- NOTE: This runs as SECURITY DEFINER, which completely bypasses RLS. 
-- Thus, the INSERT into subscriptions succeeds despite the calling user having no INSERT policy.
CREATE OR REPLACE FUNCTION public.create_organization(
    p_org_id UUID,
    p_name TEXT,
    p_slug TEXT,
    p_user_id UUID,
    p_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert the organization
    INSERT INTO public.organizations (id, name, slug, status, created_at, updated_at)
    VALUES (p_org_id, p_name, p_slug, 'active', NOW(), NOW());

    -- Insert the owner membership
    INSERT INTO public.memberships (organization_id, user_id, email, role, status, created_at, updated_at)
    VALUES (p_org_id, p_user_id, p_email, 'owner', 'active', NOW(), NOW());

    -- Insert the initial trial subscription
    INSERT INTO public.subscriptions (
        organization_id, 
        status, 
        trial_started_at, 
        trial_ends_at, 
        updated_at
    )
    VALUES (
        p_org_id, 
        'trial', 
        NOW(), 
        NOW() + INTERVAL '14 days', 
        NOW()
    );

    -- Update the user profile last_active_org_id
    UPDATE public.user_profiles
    SET last_active_org_id = p_org_id
    WHERE id = p_user_id;

    -- Write Audit Log
    INSERT INTO public.auth_audit_logs (user_id, event_type, metadata)
    VALUES (
        p_user_id, 
        'ORG_CREATED', 
        jsonb_build_object(
            'organization_id', p_org_id, 
            'name', p_name, 
            'slug', p_slug
        )
    );
END;
$$;


-- ==========================================
-- MIGRATION: 20240105000000_accept_invite_rpc.sql
-- ==========================================

-- supabase/migrations/20240105000000_accept_invite_rpc.sql

CREATE OR REPLACE FUNCTION public.accept_invitation(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_membership_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get user email from auth.users (to match against the invitation email)
    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

    -- Find pending invite
    SELECT id INTO v_membership_id
    FROM public.memberships
    WHERE organization_id = p_org_id
      AND email = v_email
      AND status = 'pending_invitation';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No pending invitation found for this email in this organization.';
    END IF;

    -- Update membership to active and assign the user_id
    UPDATE public.memberships
    SET status = 'active', user_id = v_user_id, updated_at = NOW()
    WHERE id = v_membership_id;

    -- Update last active org
    UPDATE public.user_profiles
    SET last_active_org_id = p_org_id
    WHERE id = v_user_id;

    -- Record audit log
    INSERT INTO public.auth_audit_logs (user_id, event_type, metadata)
    VALUES (v_user_id, 'MEMBER_JOINED', jsonb_build_object('organization_id', p_org_id, 'membership_id', v_membership_id));
END;
$$;


-- ==========================================
-- MIGRATION: 20240106000000_security_patches.sql
-- ==========================================

-- supabase/migrations/20240106000000_security_patches.sql

-- A. Organizations & Memberships RLS Lockdown
DROP POLICY IF EXISTS "Users can create org" ON public.organizations;
DROP POLICY IF EXISTS "Owners and Admins can update their orgs" ON public.organizations;

DROP POLICY IF EXISTS "Users can insert their own owner membership" ON public.memberships;
DROP POLICY IF EXISTS "Owners and Admins can manage memberships" ON public.memberships;

-- Structure Nodes RLS Lockdown
DROP POLICY IF EXISTS "Owners and Admins can manage structure" ON public.structure_nodes;

-- Subscriptions RLS Update (Missing session check)
DROP POLICY IF EXISTS "Super Admins can update subscriptions" ON public.subscriptions;
CREATE POLICY "Super Admins can update subscriptions" ON public.subscriptions FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_super_admin = true)
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- Foreign Key fix for last_active_org_id
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS fk_last_active_org;

ALTER TABLE public.user_profiles
ADD CONSTRAINT fk_last_active_org FOREIGN KEY (last_active_org_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- B. Memberships Delete Trigger
CREATE OR REPLACE FUNCTION public.block_owner_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.role = 'owner' THEN
        RAISE EXCEPTION 'INVALID_OPERATION: Cannot delete the owner membership. Transfer ownership first.';
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS block_owner_deletion_trigger ON public.memberships;
CREATE TRIGGER block_owner_deletion_trigger
BEFORE DELETE ON public.memberships
FOR EACH ROW
EXECUTE FUNCTION public.block_owner_deletion();

-- C. Atomic RPCs for Organizations

CREATE OR REPLACE FUNCTION public.update_organization(
    p_org_id UUID,
    p_updates JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT public.is_org_admin(p_org_id) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only Owners and Admins can update the organization.';
    END IF;

    -- Extract values safely
    UPDATE public.organizations
    SET 
        name = COALESCE(p_updates->>'name', name),
        logo_url = COALESCE(p_updates->>'logo_url', logo_url),
        industry = COALESCE(p_updates->>'industry', industry),
        size = COALESCE(p_updates->>'size', size),
        locale = COALESCE(p_updates->>'locale', locale),
        timezone = COALESCE(p_updates->>'timezone', timezone),
        currency = COALESCE(p_updates->>'currency', currency),
        updated_at = NOW()
    WHERE id = p_org_id;

    IF p_updates ? 'slug' THEN
        UPDATE public.organizations SET slug = p_updates->>'slug' WHERE id = p_org_id;
    END IF;

    INSERT INTO public.auth_audit_logs (user_id, event_type, metadata)
    VALUES (
        auth.uid(), 
        'ORG_UPDATED', 
        jsonb_build_object('organization_id', p_org_id, 'updates', p_updates)
    );
END;
$$;

-- D. Atomic RPCs for Memberships

CREATE OR REPLACE FUNCTION public.invite_member(
    p_org_id UUID,
    p_email TEXT,
    p_role public.membership_role
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_membership_id UUID;
    v_status public.membership_status;
BEGIN
    IF NOT public.is_org_admin(p_org_id) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only Owners and Admins can invite members.';
    END IF;

    -- Check existing
    SELECT id, status INTO v_membership_id, v_status
    FROM public.memberships
    WHERE organization_id = p_org_id AND email = p_email;

    IF FOUND THEN
        IF v_status = 'active' THEN
            RAISE EXCEPTION 'INVALID_OPERATION: User is already an active member of this organization.';
        END IF;

        UPDATE public.memberships
        SET status = 'pending_invitation', role = p_role, updated_at = NOW()
        WHERE id = v_membership_id;
    ELSE
        INSERT INTO public.memberships (organization_id, email, role, status)
        VALUES (p_org_id, p_email, p_role, 'pending_invitation')
        RETURNING id INTO v_membership_id;
    END IF;

    INSERT INTO public.auth_audit_logs (user_id, event_type, metadata)
    VALUES (
        auth.uid(), 
        'MEMBER_INVITED', 
        jsonb_build_object('organization_id', p_org_id, 'email', p_email, 'role', p_role)
    );

    RETURN v_membership_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_membership_status(
    p_membership_id UUID,
    p_status public.membership_status
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_role public.membership_role;
    v_email TEXT;
BEGIN
    -- Get org_id for authorization
    SELECT organization_id, role, email INTO v_org_id, v_role, v_email
    FROM public.memberships
    WHERE id = p_membership_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Membership does not exist.';
    END IF;

    IF NOT public.is_org_admin(v_org_id) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only Owners and Admins can update membership status.';
    END IF;

    IF p_status = 'removed' AND v_role = 'owner' THEN
        RAISE EXCEPTION 'INVALID_OPERATION: Cannot remove the owner. Transfer ownership first.';
    END IF;

    UPDATE public.memberships
    SET status = p_status, updated_at = NOW()
    WHERE id = p_membership_id;

    INSERT INTO public.auth_audit_logs (user_id, event_type, metadata)
    VALUES (
        auth.uid(), 
        'MEMBERSHIP_STATUS_UPDATED', 
        jsonb_build_object('organization_id', v_org_id, 'membership_id', p_membership_id, 'status', p_status)
    );
END;
$$;

-- E. Atomic RPCs for Structure Nodes

CREATE OR REPLACE FUNCTION public.create_structure_node(
    p_org_id UUID,
    p_parent_id UUID,
    p_name TEXT,
    p_type TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_node_id UUID;
BEGIN
    IF NOT public.is_org_admin(p_org_id) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only Owners and Admins can create structure nodes.';
    END IF;

    INSERT INTO public.structure_nodes (organization_id, parent_id, name, type)
    VALUES (p_org_id, p_parent_id, p_name, p_type::public.structure_node_type)
    RETURNING id INTO v_node_id;

    INSERT INTO public.auth_audit_logs (user_id, event_type, metadata)
    VALUES (
        auth.uid(), 
        'STRUCTURE_NODE_CREATED', 
        jsonb_build_object('organization_id', p_org_id, 'node_id', v_node_id, 'name', p_name, 'type', p_type)
    );

    RETURN v_node_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_structure_node(
    p_node_id UUID,
    p_name TEXT,
    p_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id
    FROM public.structure_nodes
    WHERE id = p_node_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Structure node does not exist.';
    END IF;

    IF NOT public.is_org_admin(v_org_id) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only Owners and Admins can update structure nodes.';
    END IF;

    UPDATE public.structure_nodes
    SET 
        name = COALESCE(p_name, name),
        type = COALESCE(p_type::public.structure_node_type, type),
        updated_at = NOW()
    WHERE id = p_node_id;

    INSERT INTO public.auth_audit_logs (user_id, event_type, metadata)
    VALUES (
        auth.uid(), 
        'STRUCTURE_NODE_UPDATED', 
        jsonb_build_object('organization_id', v_org_id, 'node_id', p_node_id, 'name', p_name, 'type', p_type)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_structure_node(
    p_node_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_children_count INT;
    v_members_count INT;
BEGIN
    SELECT organization_id INTO v_org_id
    FROM public.structure_nodes
    WHERE id = p_node_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Structure node does not exist.';
    END IF;

    IF NOT public.is_org_admin(v_org_id) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Only Owners and Admins can archive structure nodes.';
    END IF;

    -- Dependent Checking
    SELECT COUNT(*) INTO v_children_count
    FROM public.structure_nodes
    WHERE parent_id = p_node_id AND status = 'active';

    IF v_children_count > 0 THEN
        RAISE EXCEPTION 'INVALID_OPERATION: Cannot archive a node that has active child nodes.';
    END IF;

    SELECT COUNT(*) INTO v_members_count
    FROM public.memberships
    WHERE structure_node_id = p_node_id AND status != 'removed';

    IF v_members_count > 0 THEN
        RAISE EXCEPTION 'INVALID_OPERATION: Cannot archive a node that has active memberships assigned to it.';
    END IF;

    UPDATE public.structure_nodes
    SET status = 'archived', updated_at = NOW()
    WHERE id = p_node_id;

    INSERT INTO public.auth_audit_logs (user_id, event_type, metadata)
    VALUES (
        auth.uid(), 
        'STRUCTURE_NODE_ARCHIVED', 
        jsonb_build_object('organization_id', v_org_id, 'node_id', p_node_id)
    );
END;
$$;


-- ==========================================
-- MIGRATION: 20240107000000_notifications_schema.sql
-- ==========================================

-- supabase/migrations/20240107000000_notifications_schema.sql

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT
USING (
    auth.uid() = user_id
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Users can mark their own notifications as read" ON public.notifications FOR UPDATE
USING (
    auth.uid() = user_id
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
)
WITH CHECK (
    auth.uid() = user_id
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- RPC
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications
    SET is_read = true
    WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;


-- ==========================================
-- MIGRATION: 20240108000000_audit_logging_schema.sql
-- ==========================================

-- supabase/migrations/20240108000000_audit_logging_schema.sql

-- 1. Create the new unified audit_logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID, -- Nullable for platform/auth events
    user_id UUID,
    event_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Migrate existing records from auth_audit_logs if it exists
INSERT INTO public.audit_logs (user_id, event_type, metadata, created_at)
SELECT user_id, event_type, metadata, created_at FROM public.auth_audit_logs;

-- Drop the old stub table
DROP TABLE IF EXISTS public.auth_audit_logs;

-- 3. Enforce absolute immutability via Trigger
CREATE OR REPLACE FUNCTION public.block_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be updated or deleted.';
END;
$$;

CREATE TRIGGER tr_audit_logs_immutable
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.block_audit_log_modification();

-- 4. Set up RLS for viewing
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org Admins can view their org audit logs" ON public.audit_logs
FOR SELECT
USING (
    organization_id IS NOT NULL 
    AND public.is_org_admin(organization_id)
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- Note: We do NOT create an INSERT policy. Inserts are only allowed via SECURITY DEFINER functions/triggers.

-- 5. Update the manual RPC for frontend events (Auth/Billing)
CREATE OR REPLACE FUNCTION public.record_audit_log(
    p_event_type TEXT, 
    p_user_id UUID, 
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_organization_id UUID DEFAULT NULL,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.audit_logs (
        organization_id, user_id, event_type, entity_type, entity_id, metadata
    ) VALUES (
        p_organization_id, p_user_id, p_event_type, p_entity_type, p_entity_id, p_metadata
    );
END;
$$;

-- 6. Generic Database Trigger for automatic backend auditing
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_user_id UUID;
    v_metadata JSONB;
    v_entity_id UUID;
    v_new_json JSONB;
    v_old_json JSONB;
BEGIN
    v_user_id := auth.uid();
    v_new_json := to_jsonb(NEW);
    v_old_json := to_jsonb(OLD);
    
    -- Safely extract organization_id
    IF TG_TABLE_NAME = 'organizations' THEN
        v_org_id := COALESCE((v_new_json->>'id')::UUID, (v_old_json->>'id')::UUID);
    ELSE
        v_org_id := COALESCE((v_new_json->>'organization_id')::UUID, (v_old_json->>'organization_id')::UUID);
    END IF;

    -- Safely extract entity_id
    v_entity_id := COALESCE((v_new_json->>'id')::UUID, (v_old_json->>'id')::UUID);

    -- Build metadata
    v_metadata := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'action', TG_OP,
        'old_record', v_old_json,
        'new_record', v_new_json
    );

    -- Insert directly into audit_logs bypassing RLS
    INSERT INTO public.audit_logs (
        organization_id, user_id, event_type, entity_type, entity_id, metadata
    ) VALUES (
        v_org_id, v_user_id, 'DB_' || TG_OP, TG_TABLE_NAME, v_entity_id, v_metadata
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- 7. Attach generic audit trigger to core tables
CREATE TRIGGER tr_audit_organizations
AFTER INSERT OR UPDATE OR DELETE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER tr_audit_memberships
AFTER INSERT OR UPDATE OR DELETE ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER tr_audit_structure_nodes
AFTER INSERT OR UPDATE OR DELETE ON public.structure_nodes
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER tr_audit_custom_roles
AFTER INSERT OR UPDATE OR DELETE ON public.custom_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER tr_audit_permission_grants
AFTER INSERT OR UPDATE OR DELETE ON public.permission_grants
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER tr_audit_subscriptions
AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();


-- ==========================================
-- MIGRATION: 20240109000000_platform_admin_schema.sql
-- ==========================================

-- supabase/migrations/20240109000000_platform_admin_schema.sql

CREATE OR REPLACE FUNCTION public.get_platform_organizations()
RETURNS TABLE (
    organization_id UUID,
    organization_name TEXT,
    created_at TIMESTAMPTZ,
    owner_email TEXT,
    subscription_status TEXT,
    organization_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_super_admin BOOLEAN;
BEGIN
    -- Verify super admin status
    SELECT is_super_admin INTO v_is_super_admin FROM public.user_profiles WHERE id = auth.uid();
    IF NOT v_is_super_admin THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required.';
    END IF;

    RETURN QUERY
    SELECT 
        o.id AS organization_id,
        o.name AS organization_name,
        o.created_at,
        m.email AS owner_email,
        s.status::TEXT AS subscription_status,
        o.status::TEXT AS organization_status
    FROM public.organizations o
    LEFT JOIN public.memberships m ON m.organization_id = o.id AND m.role = 'owner'
    LEFT JOIN public.subscriptions s ON s.organization_id = o.id
    ORDER BY o.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_platform_organization(p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_super_admin BOOLEAN;
BEGIN
    SELECT is_super_admin INTO v_is_super_admin FROM public.user_profiles WHERE id = auth.uid();
    IF NOT COALESCE(v_is_super_admin, false) THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required.';
    END IF;

    UPDATE public.organizations
    SET status = 'archived', updated_at = NOW()
    WHERE id = p_org_id;
END;
$$;


-- ==========================================
-- MIGRATION: 20240110000000_file_storage_schema.sql
-- ==========================================

-- supabase/migrations/20240110000000_file_storage_schema.sql

-- 1. Create file_records table for Postgres metadata tracking
CREATE TABLE public.file_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    feature_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size BIGINT NOT NULL,
    content_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for file_records
ALTER TABLE public.file_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org file records" ON public.file_records FOR SELECT
USING (
    public.has_active_membership(organization_id)
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Users can insert org file records" ON public.file_records FOR INSERT
WITH CHECK (
    public.has_active_membership(organization_id)
    AND auth.uid() = uploaded_by
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Org Admins can delete file records" ON public.file_records FOR DELETE
USING (
    public.is_org_admin(organization_id)
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- Attach the generic audit trigger from Module 4
CREATE TRIGGER tr_audit_file_records
AFTER INSERT OR UPDATE OR DELETE ON public.file_records
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 2. Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('workspaces', 'workspaces', false, 10485760) -- 10MB limit
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS Policies
-- Path structure: {organization_id}/{feature_name}/{file_name}
-- storage.foldername(name)[1] extracts the organization_id from the path

CREATE POLICY "Users can view workspace files for their org" ON storage.objects FOR SELECT
USING (
    bucket_id = 'workspaces' 
    AND public.has_active_membership(NULLIF((storage.foldername(name))[1], '')::uuid)
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Users can upload workspace files for their org" ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'workspaces' 
    AND public.has_active_membership(NULLIF((storage.foldername(name))[1], '')::uuid)
    AND auth.uid() = owner
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Users can update workspace files for their org" ON storage.objects FOR UPDATE
USING (
    bucket_id = 'workspaces' 
    AND public.has_active_membership(NULLIF((storage.foldername(name))[1], '')::uuid)
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Org Admins can delete workspace files" ON storage.objects FOR DELETE
USING (
    bucket_id = 'workspaces' 
    AND public.is_org_admin(NULLIF((storage.foldername(name))[1], '')::uuid)
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);


-- ==========================================
-- MIGRATION: 20240112000000_core_hr_schema.sql
-- ==========================================

-- supabase/migrations/20240112000000_core_hr_schema.sql

-- 1. Departments Table
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- RLS for departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org departments" ON public.departments FOR SELECT
USING (public.has_active_membership(organization_id));

CREATE POLICY "Org Admins can manage departments" ON public.departments FOR ALL
USING (public.is_org_admin(organization_id));

-- 2. Employee Profiles Table
CREATE TABLE public.employee_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE UNIQUE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_code TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    designation TEXT,
    date_of_joining DATE,
    manager_id UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
    employment_type TEXT DEFAULT 'Full-time',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for employee_profiles
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org employee profiles" ON public.employee_profiles FOR SELECT
USING (public.has_active_membership(organization_id));

CREATE POLICY "Org Admins can manage employee profiles" ON public.employee_profiles FOR ALL
USING (public.is_org_admin(organization_id));

-- Note: We don't allow users to update their own HR records via standard UPDATE to prevent self-promotion (e.g. changing their own designation).
-- Admins will do this via the UI, or users can have a controlled RPC if we want self-service updates later.


-- 3. Audit Triggers
DROP TRIGGER IF EXISTS tr_audit_departments ON public.departments;
CREATE TRIGGER tr_audit_departments
AFTER INSERT OR UPDATE OR DELETE ON public.departments
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS tr_audit_employee_profiles ON public.employee_profiles;
CREATE TRIGGER tr_audit_employee_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.employee_profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();


-- 4. Auto-initialize Employee Profile for Memberships
CREATE OR REPLACE FUNCTION public.tr_create_employee_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.employee_profiles (membership_id, organization_id)
    VALUES (NEW.id, NEW.organization_id)
    ON CONFLICT (membership_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_ensure_employee_profile ON public.memberships;
CREATE TRIGGER tr_ensure_employee_profile
AFTER INSERT ON public.memberships
FOR EACH ROW
EXECUTE FUNCTION public.tr_create_employee_profile();

-- Retroactively create profiles for all existing memberships
INSERT INTO public.employee_profiles (membership_id, organization_id)
SELECT id, organization_id FROM public.memberships
ON CONFLICT (membership_id) DO NOTHING;


-- ==========================================
-- MIGRATION: 20240113000000_modules_3_to_6_fixes.sql
-- ==========================================

-- supabase/migrations/20240113000000_modules_3_to_6_fixes.sql

-- ==========================================
-- MODULE 3: Notification Framework Rebuild
-- ==========================================

-- 1. Create notification_templates
CREATE TABLE public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title_template TEXT NOT NULL,
    message_template TEXT NOT NULL,
    requires_email BOOLEAN DEFAULT false,
    requires_in_app BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Platform Admins can manage templates, everyone can view
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view notification templates" ON public.notification_templates FOR SELECT USING (true);
CREATE POLICY "Super Admins can manage templates" ON public.notification_templates FOR ALL USING (
    (SELECT is_super_admin FROM public.user_profiles WHERE id = auth.uid()) = true
);

-- 2. Create notification_deliveries queue
CREATE TABLE public.notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_slug TEXT NOT NULL REFERENCES public.notification_templates(slug),
    payload JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
-- No policies needed. Only accessible via RPCs/triggers/service_role

-- 3. Create dispatch_notification RPC
CREATE OR REPLACE FUNCTION public.dispatch_notification(
    p_org_id UUID,
    p_user_id UUID,
    p_template_slug TEXT,
    p_payload JSONB DEFAULT '{}'::jsonb,
    p_action_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_template public.notification_templates%ROWTYPE;
    v_title TEXT;
    v_message TEXT;
    v_key TEXT;
    v_value TEXT;
BEGIN
    -- Lookup template
    SELECT * INTO v_template FROM public.notification_templates WHERE slug = p_template_slug;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Notification template not found: %', p_template_slug;
    END IF;

    -- Basic hydration for title and message (replace {{key}} with value)
    v_title := v_template.title_template;
    v_message := v_template.message_template;
    
    FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_payload)
    LOOP
        v_title := replace(v_title, '{{' || v_key || '}}', v_value);
        v_message := replace(v_message, '{{' || v_key || '}}', v_value);
    END LOOP;

    -- Create in-app notification
    IF v_template.requires_in_app THEN
        INSERT INTO public.notifications (
            organization_id, user_id, type, title, message, action_url
        ) VALUES (
            p_org_id, p_user_id, p_template_slug, v_title, v_message, p_action_url
        );
    END IF;

    -- Queue for external delivery
    IF v_template.requires_email THEN
        INSERT INTO public.notification_deliveries (
            organization_id, user_id, template_slug, payload
        ) VALUES (
            p_org_id, p_user_id, p_template_slug, p_payload
        );
    END IF;
END;
$$;


-- ==========================================
-- MODULE 4: Audit Logging Patch
-- ==========================================
-- Add Super Admin cross-org visibility policy
CREATE POLICY "Super Admins can view all audit logs" ON public.audit_logs
FOR SELECT
USING (
    (SELECT is_super_admin FROM public.user_profiles WHERE id = auth.uid()) = true
);


-- ==========================================
-- MODULE 5: File Storage Patch
-- ==========================================
-- Drop permissive UPDATE policy and replace with strict one
DROP POLICY IF EXISTS "Users can update workspace files for their org" ON storage.objects;

CREATE POLICY "Users can update workspace files for their org" ON storage.objects FOR UPDATE
USING (
    bucket_id = 'workspaces' 
    AND public.has_active_membership(NULLIF((storage.foldername(name))[1], '')::uuid)
    AND (
        auth.uid() = owner 
        OR public.is_org_admin(NULLIF((storage.foldername(name))[1], '')::uuid)
    )
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);


-- ==========================================
-- MODULE 6: Employee Management Rebuild
-- ==========================================

-- 1. Departments: Fix RLS to SELECT only, add RPCs
DROP POLICY IF EXISTS "Org Admins can manage departments" ON public.departments;

-- No direct INSERT/UPDATE/DELETE policies, mutations only through RPC

CREATE OR REPLACE FUNCTION public.create_department(p_org_id UUID, p_name TEXT, p_description TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_dept_id UUID;
BEGIN
    IF NOT public.is_org_admin(p_org_id) THEN
        RAISE EXCEPTION 'Unauthorized: Org Admin access required.';
    END IF;

    INSERT INTO public.departments (organization_id, name, description)
    VALUES (p_org_id, p_name, p_description)
    RETURNING id INTO v_dept_id;

    RETURN v_dept_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_department(p_dept_id UUID, p_name TEXT, p_description TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id FROM public.departments WHERE id = p_dept_id;
    
    IF NOT public.is_org_admin(v_org_id) THEN
        RAISE EXCEPTION 'Unauthorized: Org Admin access required.';
    END IF;

    UPDATE public.departments
    SET name = COALESCE(p_name, name),
        description = COALESCE(p_description, description),
        updated_at = NOW()
    WHERE id = p_dept_id;
END;
$$;

-- Cannot archive/delete if employees are assigned
CREATE OR REPLACE FUNCTION public.archive_department(p_dept_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_employee_count INT;
BEGIN
    SELECT organization_id INTO v_org_id FROM public.departments WHERE id = p_dept_id;
    
    IF NOT public.is_org_admin(v_org_id) THEN
        RAISE EXCEPTION 'Unauthorized: Org Admin access required.';
    END IF;

    SELECT COUNT(*) INTO v_employee_count FROM public.employee_profiles WHERE department_id = p_dept_id;
    IF v_employee_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete department: % employees assigned.', v_employee_count;
    END IF;

    DELETE FROM public.departments WHERE id = p_dept_id;
END;
$$;


-- 2. Employee Profiles: Fix RLS, add Employment Status
DROP POLICY IF EXISTS "Org Admins can manage employee profiles" ON public.employee_profiles;

ALTER TABLE public.employee_profiles 
ADD COLUMN employment_status TEXT DEFAULT 'Active' CHECK (employment_status IN ('Active', 'On Leave', 'Suspended', 'Terminated'));

-- Block hard-deletes
CREATE OR REPLACE FUNCTION public.block_employee_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Hard deletes on employee_profiles are strictly forbidden. Use update_employment_status RPC instead.';
END;
$$;

CREATE TRIGGER tr_block_employee_delete
BEFORE DELETE ON public.employee_profiles
FOR EACH ROW EXECUTE FUNCTION public.block_employee_hard_delete();

-- RPC for updating HR profile details
CREATE OR REPLACE FUNCTION public.update_employee_profile(
    p_employee_id UUID,
    p_employee_code TEXT DEFAULT NULL,
    p_department_id UUID DEFAULT NULL,
    p_designation TEXT DEFAULT NULL,
    p_date_of_joining DATE DEFAULT NULL,
    p_manager_id UUID DEFAULT NULL,
    p_employment_type TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id FROM public.employee_profiles WHERE id = p_employee_id;
    
    IF NOT public.is_org_admin(v_org_id) THEN
        RAISE EXCEPTION 'Unauthorized: Org Admin access required.';
    END IF;

    UPDATE public.employee_profiles
    SET 
        employee_code = COALESCE(p_employee_code, employee_code),
        department_id = COALESCE(p_department_id, department_id),
        designation = COALESCE(p_designation, designation),
        date_of_joining = COALESCE(p_date_of_joining, date_of_joining),
        manager_id = COALESCE(p_manager_id, manager_id),
        employment_type = COALESCE(p_employment_type, employment_type),
        updated_at = NOW()
    WHERE id = p_employee_id;
END;
$$;

-- RPC for Lifecycle Status transition
CREATE OR REPLACE FUNCTION public.update_employment_status(
    p_employee_id UUID,
    p_new_status TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id FROM public.employee_profiles WHERE id = p_employee_id;
    
    IF NOT public.is_org_admin(v_org_id) THEN
        RAISE EXCEPTION 'Unauthorized: Org Admin access required.';
    END IF;

    -- Basic validation
    IF p_new_status NOT IN ('Active', 'On Leave', 'Suspended', 'Terminated') THEN
        RAISE EXCEPTION 'Invalid employment status: %', p_new_status;
    END IF;

    UPDATE public.employee_profiles
    SET employment_status = p_new_status,
        updated_at = NOW()
    WHERE id = p_employee_id;

    -- Log the transition explicitly if a reason is provided
    IF p_reason IS NOT NULL THEN
        PERFORM public.record_audit_log(
            'EMPLOYMENT_STATUS_CHANGED', 
            auth.uid(), 
            jsonb_build_object('old_status', (SELECT employment_status FROM public.employee_profiles WHERE id = p_employee_id), 'new_status', p_new_status, 'reason', p_reason),
            v_org_id,
            'employee_profiles',
            p_employee_id
        );
    END IF;
END;
$$;


