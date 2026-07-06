-- fallback_notification_rpc.sql
-- Run this in your Supabase SQL Editor to enable In-App Notifications without needing Docker/Edge Functions

CREATE OR REPLACE FUNCTION public.create_in_app_notification(
    p_organization_id UUID,
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_action_url TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.notifications (
        organization_id,
        user_id,
        type,
        title,
        message,
        action_url
    )
    VALUES (
        p_organization_id,
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_action_url
    );
END;
$$;
