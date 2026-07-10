-- supabase/migrations/20240315000000_superadmin_expansion.sql

-- 1. Enhance get_platform_organizations to return total_members
DROP FUNCTION IF EXISTS public.get_platform_organizations();

CREATE OR REPLACE FUNCTION public.get_platform_organizations()
RETURNS TABLE (
    organization_id UUID,
    organization_name TEXT,
    created_at TIMESTAMPTZ,
    owner_email TEXT,
    subscription_status TEXT,
    organization_status TEXT,
    total_members BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_super_admin BOOLEAN;
BEGIN
    -- Verify super admin status
    SELECT u.is_super_admin INTO v_is_super_admin FROM public.user_profiles u WHERE u.id = auth.uid();
    IF NOT COALESCE(v_is_super_admin, false) THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required.';
    END IF;

    RETURN QUERY
    SELECT 
        o.id AS organization_id,
        o.name AS organization_name,
        o.created_at,
        m.email AS owner_email,
        s.status::TEXT AS subscription_status,
        o.status::TEXT AS organization_status,
        (SELECT count(*) FROM public.memberships mem WHERE mem.organization_id = o.id AND mem.status = 'active') as total_members
    FROM public.organizations o
    LEFT JOIN public.memberships m ON m.organization_id = o.id AND m.role = 'owner'
    LEFT JOIN public.subscriptions s ON s.organization_id = o.id
    ORDER BY o.created_at DESC;
END;
$$;

-- 2. Create get_system_users to fetch all users platform-wide
DROP FUNCTION IF EXISTS public.get_system_users();

CREATE OR REPLACE FUNCTION public.get_system_users()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    is_super_admin BOOLEAN,
    created_at TIMESTAMPTZ,
    last_active_org_id UUID,
    last_active_org_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_super_admin BOOLEAN;
BEGIN
    SELECT u.is_super_admin INTO v_is_super_admin FROM public.user_profiles u WHERE u.id = auth.uid();
    IF NOT COALESCE(v_is_super_admin, false) THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required.';
    END IF;

    RETURN QUERY
    SELECT 
        u.id AS user_id,
        u.email,
        u.is_super_admin,
        u.created_at,
        u.last_active_org_id,
        o.name AS last_active_org_name
    FROM public.user_profiles u
    LEFT JOIN public.organizations o ON o.id = u.last_active_org_id
    ORDER BY u.created_at DESC;
END;
$$;
