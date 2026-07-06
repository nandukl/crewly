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
