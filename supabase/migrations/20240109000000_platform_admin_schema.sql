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
