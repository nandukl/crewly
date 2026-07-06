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


