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
