-- supabase/migrations/20240112000000_core_hr_schema.sql

-- 1. Departments Table
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- RLS for departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org departments" ON public.departments FOR SELECT
USING (public.has_active_membership(organization_id));

CREATE POLICY "Org Admins can manage departments" ON public.departments FOR ALL
USING (public.is_org_admin(organization_id));

-- 2. Employee Profiles Table
CREATE TABLE public.employee_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE UNIQUE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_code TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    designation TEXT,
    date_of_joining DATE,
    manager_id UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
    employment_type TEXT DEFAULT 'Full-time',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for employee_profiles
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org employee profiles" ON public.employee_profiles FOR SELECT
USING (public.has_active_membership(organization_id));

CREATE POLICY "Org Admins can manage employee profiles" ON public.employee_profiles FOR ALL
USING (public.is_org_admin(organization_id));

-- Note: We don't allow users to update their own HR records via standard UPDATE to prevent self-promotion (e.g. changing their own designation).
-- Admins will do this via the UI, or users can have a controlled RPC if we want self-service updates later.


-- 3. Audit Triggers
DROP TRIGGER IF EXISTS tr_audit_departments ON public.departments;
CREATE TRIGGER tr_audit_departments
AFTER INSERT OR UPDATE OR DELETE ON public.departments
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS tr_audit_employee_profiles ON public.employee_profiles;
CREATE TRIGGER tr_audit_employee_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.employee_profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();


-- 4. Auto-initialize Employee Profile for Memberships
CREATE OR REPLACE FUNCTION public.tr_create_employee_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.employee_profiles (membership_id, organization_id)
    VALUES (NEW.id, NEW.organization_id)
    ON CONFLICT (membership_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_ensure_employee_profile ON public.memberships;
CREATE TRIGGER tr_ensure_employee_profile
AFTER INSERT ON public.memberships
FOR EACH ROW
EXECUTE FUNCTION public.tr_create_employee_profile();

-- Retroactively create profiles for all existing memberships
INSERT INTO public.employee_profiles (membership_id, organization_id)
SELECT id, organization_id FROM public.memberships
ON CONFLICT (membership_id) DO NOTHING;
