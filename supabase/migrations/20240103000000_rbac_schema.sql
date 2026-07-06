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
