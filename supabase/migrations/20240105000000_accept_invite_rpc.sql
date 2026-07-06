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
