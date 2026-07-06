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
