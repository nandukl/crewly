-- supabase/migrations/20260712000006_add_onboarding_status.sql

-- 1. Add onboarding_completed flag to organizations
ALTER TABLE public.organizations 
ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- 2. Create RPC to complete onboarding securely
CREATE OR REPLACE FUNCTION public.complete_organization_onboarding(
    p_org_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Ensure the user is an owner or org_admin of this org
    IF NOT public.is_org_admin(p_org_id) THEN
        RAISE EXCEPTION 'Not authorized to complete onboarding for this organization';
    END IF;

    UPDATE public.organizations
    SET onboarding_completed = true,
        updated_at = NOW()
    WHERE id = p_org_id;

    -- Write Audit Log
    INSERT INTO public.auth_audit_logs (user_id, event_type, metadata)
    VALUES (
        auth.uid(), 
        'ORG_ONBOARDING_COMPLETED', 
        jsonb_build_object('organization_id', p_org_id)
    );
END;
$$;
