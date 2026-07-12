-- supabase/migrations/20260712000005_expand_create_org_rpc.sql

-- Drop the old function first if we are changing its signature significantly,
-- though CREATE OR REPLACE FUNCTION usually handles it if the signature (number/type of args) matches.
-- Here we are changing the signature, so we should drop it.
DROP FUNCTION IF EXISTS public.create_organization(UUID, TEXT, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.create_organization(
    p_org_id UUID,
    p_name TEXT,
    p_slug TEXT,
    p_user_id UUID,
    p_email TEXT,
    p_industry TEXT DEFAULT NULL,
    p_size TEXT DEFAULT NULL,
    p_locale TEXT DEFAULT NULL,
    p_timezone TEXT DEFAULT NULL,
    p_currency TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert the organization with all new fields
    INSERT INTO public.organizations (id, name, slug, industry, size, locale, timezone, currency, status, created_at, updated_at)
    VALUES (p_org_id, p_name, p_slug, p_industry, p_size, p_locale, p_timezone, p_currency, 'active', NOW(), NOW());

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
            'slug', p_slug,
            'industry', p_industry,
            'size', p_size,
            'locale', p_locale,
            'timezone', p_timezone,
            'currency', p_currency
        )
    );
END;
$$;
