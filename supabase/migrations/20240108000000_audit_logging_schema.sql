-- supabase/migrations/20240108000000_audit_logging_schema.sql

-- 1. Create the new unified audit_logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID, -- Nullable for platform/auth events
    user_id UUID,
    event_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Migrate existing records from auth_audit_logs if it exists
INSERT INTO public.audit_logs (user_id, event_type, metadata, created_at)
SELECT user_id, event_type, metadata, created_at FROM public.auth_audit_logs;

-- Drop the old stub table
DROP TABLE IF EXISTS public.auth_audit_logs;

-- 3. Enforce absolute immutability via Trigger
CREATE OR REPLACE FUNCTION public.block_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be updated or deleted.';
END;
$$;

CREATE TRIGGER tr_audit_logs_immutable
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.block_audit_log_modification();

-- 4. Set up RLS for viewing
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org Admins can view their org audit logs" ON public.audit_logs
FOR SELECT
USING (
    organization_id IS NOT NULL 
    AND public.is_org_admin(organization_id)
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- Note: We do NOT create an INSERT policy. Inserts are only allowed via SECURITY DEFINER functions/triggers.

-- 5. Update the manual RPC for frontend events (Auth/Billing)
CREATE OR REPLACE FUNCTION public.record_audit_log(
    p_event_type TEXT, 
    p_user_id UUID, 
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_organization_id UUID DEFAULT NULL,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.audit_logs (
        organization_id, user_id, event_type, entity_type, entity_id, metadata
    ) VALUES (
        p_organization_id, p_user_id, p_event_type, p_entity_type, p_entity_id, p_metadata
    );
END;
$$;

-- 6. Generic Database Trigger for automatic backend auditing
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_user_id UUID;
    v_metadata JSONB;
    v_entity_id UUID;
    v_new_json JSONB;
    v_old_json JSONB;
BEGIN
    v_user_id := auth.uid();
    v_new_json := to_jsonb(NEW);
    v_old_json := to_jsonb(OLD);
    
    -- Safely extract organization_id
    IF TG_TABLE_NAME = 'organizations' THEN
        v_org_id := COALESCE((v_new_json->>'id')::UUID, (v_old_json->>'id')::UUID);
    ELSE
        v_org_id := COALESCE((v_new_json->>'organization_id')::UUID, (v_old_json->>'organization_id')::UUID);
    END IF;

    -- Safely extract entity_id
    v_entity_id := COALESCE((v_new_json->>'id')::UUID, (v_old_json->>'id')::UUID);

    -- Build metadata
    v_metadata := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'action', TG_OP,
        'old_record', v_old_json,
        'new_record', v_new_json
    );

    -- Insert directly into audit_logs bypassing RLS
    INSERT INTO public.audit_logs (
        organization_id, user_id, event_type, entity_type, entity_id, metadata
    ) VALUES (
        v_org_id, v_user_id, 'DB_' || TG_OP, TG_TABLE_NAME, v_entity_id, v_metadata
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- 7. Attach generic audit trigger to core tables
CREATE TRIGGER tr_audit_organizations
AFTER INSERT OR UPDATE OR DELETE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER tr_audit_memberships
AFTER INSERT OR UPDATE OR DELETE ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER tr_audit_structure_nodes
AFTER INSERT OR UPDATE OR DELETE ON public.structure_nodes
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER tr_audit_custom_roles
AFTER INSERT OR UPDATE OR DELETE ON public.custom_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER tr_audit_permission_grants
AFTER INSERT OR UPDATE OR DELETE ON public.permission_grants
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER tr_audit_subscriptions
AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
