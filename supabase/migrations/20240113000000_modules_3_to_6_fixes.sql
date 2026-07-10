-- supabase/migrations/20240113000000_modules_3_to_6_fixes.sql

-- ==========================================
-- MODULE 3: Notification Framework Rebuild
-- ==========================================

-- 1. Create notification_templates
CREATE TABLE public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title_template TEXT NOT NULL,
    message_template TEXT NOT NULL,
    requires_email BOOLEAN DEFAULT false,
    requires_in_app BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Platform Admins can manage templates, everyone can view
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view notification templates" ON public.notification_templates FOR SELECT USING (true);
CREATE POLICY "Super Admins can manage templates" ON public.notification_templates FOR ALL USING (
    (SELECT is_super_admin FROM public.user_profiles WHERE id = auth.uid()) = true
);

-- 2. Create notification_deliveries queue
CREATE TABLE public.notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_slug TEXT NOT NULL REFERENCES public.notification_templates(slug),
    payload JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
-- No policies needed. Only accessible via RPCs/triggers/service_role

-- 3. Create dispatch_notification RPC
CREATE OR REPLACE FUNCTION public.dispatch_notification(
    p_org_id UUID,
    p_user_id UUID,
    p_template_slug TEXT,
    p_payload JSONB DEFAULT '{}'::jsonb,
    p_action_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_template public.notification_templates%ROWTYPE;
    v_title TEXT;
    v_message TEXT;
    v_key TEXT;
    v_value TEXT;
BEGIN
    -- Lookup template
    SELECT * INTO v_template FROM public.notification_templates WHERE slug = p_template_slug;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Notification template not found: %', p_template_slug;
    END IF;

    -- Basic hydration for title and message (replace {{key}} with value)
    v_title := v_template.title_template;
    v_message := v_template.message_template;
    
    FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_payload)
    LOOP
        v_title := replace(v_title, '{{' || v_key || '}}', v_value);
        v_message := replace(v_message, '{{' || v_key || '}}', v_value);
    END LOOP;

    -- Create in-app notification
    IF v_template.requires_in_app THEN
        INSERT INTO public.notifications (
            organization_id, user_id, type, title, message, action_url
        ) VALUES (
            p_org_id, p_user_id, p_template_slug, v_title, v_message, p_action_url
        );
    END IF;

    -- Queue for external delivery
    IF v_template.requires_email THEN
        INSERT INTO public.notification_deliveries (
            organization_id, user_id, template_slug, payload
        ) VALUES (
            p_org_id, p_user_id, p_template_slug, p_payload
        );
    END IF;
END;
$$;


-- ==========================================
-- MODULE 4: Audit Logging Patch
-- ==========================================
-- Add Super Admin cross-org visibility policy
CREATE POLICY "Super Admins can view all audit logs" ON public.audit_logs
FOR SELECT
USING (
    (SELECT is_super_admin FROM public.user_profiles WHERE id = auth.uid()) = true
);


-- ==========================================
-- MODULE 5: File Storage Patch
-- ==========================================
-- Drop permissive UPDATE policy and replace with strict one
DROP POLICY IF EXISTS "Users can update workspace files for their org" ON storage.objects;

CREATE POLICY "Users can update workspace files for their org" ON storage.objects FOR UPDATE
USING (
    bucket_id = 'workspaces' 
    AND public.has_active_membership(NULLIF((storage.foldername(name))[1], '')::uuid)
    AND (
        auth.uid() = owner 
        OR public.is_org_admin(NULLIF((storage.foldername(name))[1], '')::uuid)
    )
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);


-- ==========================================
-- MODULE 6: Employee Management Rebuild
-- ==========================================

-- 1. Departments: Fix RLS to SELECT only, add RPCs
DROP POLICY IF EXISTS "Org Admins can manage departments" ON public.departments;

-- No direct INSERT/UPDATE/DELETE policies, mutations only through RPC

CREATE OR REPLACE FUNCTION public.create_department(p_org_id UUID, p_name TEXT, p_description TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_dept_id UUID;
BEGIN
    IF NOT public.is_org_admin(p_org_id) THEN
        RAISE EXCEPTION 'Unauthorized: Org Admin access required.';
    END IF;

    INSERT INTO public.departments (organization_id, name, description)
    VALUES (p_org_id, p_name, p_description)
    RETURNING id INTO v_dept_id;

    RETURN v_dept_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_department(p_dept_id UUID, p_name TEXT, p_description TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id FROM public.departments WHERE id = p_dept_id;
    
    IF NOT public.is_org_admin(v_org_id) THEN
        RAISE EXCEPTION 'Unauthorized: Org Admin access required.';
    END IF;

    UPDATE public.departments
    SET name = COALESCE(p_name, name),
        description = COALESCE(p_description, description),
        updated_at = NOW()
    WHERE id = p_dept_id;
END;
$$;

-- Cannot archive/delete if employees are assigned
CREATE OR REPLACE FUNCTION public.archive_department(p_dept_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_employee_count INT;
BEGIN
    SELECT organization_id INTO v_org_id FROM public.departments WHERE id = p_dept_id;
    
    IF NOT public.is_org_admin(v_org_id) THEN
        RAISE EXCEPTION 'Unauthorized: Org Admin access required.';
    END IF;

    SELECT COUNT(*) INTO v_employee_count FROM public.employee_profiles WHERE department_id = p_dept_id;
    IF v_employee_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete department: % employees assigned.', v_employee_count;
    END IF;

    DELETE FROM public.departments WHERE id = p_dept_id;
END;
$$;


-- 2. Employee Profiles: Fix RLS, add Employment Status
DROP POLICY IF EXISTS "Org Admins can manage employee profiles" ON public.employee_profiles;

ALTER TABLE public.employee_profiles 
ADD COLUMN employment_status TEXT DEFAULT 'Active' CHECK (employment_status IN ('Active', 'On Leave', 'Suspended', 'Terminated'));

-- Block hard-deletes
CREATE OR REPLACE FUNCTION public.block_employee_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Hard deletes on employee_profiles are strictly forbidden. Use update_employment_status RPC instead.';
END;
$$;

CREATE TRIGGER tr_block_employee_delete
BEFORE DELETE ON public.employee_profiles
FOR EACH ROW EXECUTE FUNCTION public.block_employee_hard_delete();

-- RPC for updating HR profile details
CREATE OR REPLACE FUNCTION public.update_employee_profile(
    p_employee_id UUID,
    p_employee_code TEXT DEFAULT NULL,
    p_department_id UUID DEFAULT NULL,
    p_designation TEXT DEFAULT NULL,
    p_date_of_joining DATE DEFAULT NULL,
    p_manager_id UUID DEFAULT NULL,
    p_employment_type TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id FROM public.employee_profiles WHERE id = p_employee_id;
    
    IF NOT public.is_org_admin(v_org_id) THEN
        RAISE EXCEPTION 'Unauthorized: Org Admin access required.';
    END IF;

    UPDATE public.employee_profiles
    SET 
        employee_code = COALESCE(p_employee_code, employee_code),
        department_id = COALESCE(p_department_id, department_id),
        designation = COALESCE(p_designation, designation),
        date_of_joining = COALESCE(p_date_of_joining, date_of_joining),
        manager_id = COALESCE(p_manager_id, manager_id),
        employment_type = COALESCE(p_employment_type, employment_type),
        updated_at = NOW()
    WHERE id = p_employee_id;
END;
$$;

-- RPC for Lifecycle Status transition
CREATE OR REPLACE FUNCTION public.update_employment_status(
    p_employee_id UUID,
    p_new_status TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id FROM public.employee_profiles WHERE id = p_employee_id;
    
    IF NOT public.is_org_admin(v_org_id) THEN
        RAISE EXCEPTION 'Unauthorized: Org Admin access required.';
    END IF;

    -- Basic validation
    IF p_new_status NOT IN ('Active', 'On Leave', 'Suspended', 'Terminated') THEN
        RAISE EXCEPTION 'Invalid employment status: %', p_new_status;
    END IF;

    UPDATE public.employee_profiles
    SET employment_status = p_new_status,
        updated_at = NOW()
    WHERE id = p_employee_id;

    -- Log the transition explicitly if a reason is provided
    IF p_reason IS NOT NULL THEN
        PERFORM public.record_audit_log(
            'EMPLOYMENT_STATUS_CHANGED', 
            auth.uid(), 
            jsonb_build_object('old_status', (SELECT employment_status FROM public.employee_profiles WHERE id = p_employee_id), 'new_status', p_new_status, 'reason', p_reason),
            v_org_id,
            'employee_profiles',
            p_employee_id
        );
    END IF;
END;
$$;
