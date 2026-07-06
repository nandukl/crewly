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
