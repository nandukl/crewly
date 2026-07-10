-- supabase/migrations/20240701000000_projects_schema.sql

-- Projects Module

CREATE TYPE public.pm_project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'archived');
CREATE TYPE public.pm_task_status AS ENUM ('todo', 'in_progress', 'review', 'done');
CREATE TYPE public.pm_task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- 1. Projects
CREATE TABLE public.pm_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    description TEXT,
    status public.pm_project_status NOT NULL DEFAULT 'planning',
    start_date DATE,
    end_date DATE,
    crm_account_id UUID REFERENCES public.crm_accounts(id), -- Nullable, link to client
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tasks
CREATE TABLE public.pm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    project_id UUID NOT NULL REFERENCES public.pm_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assignee_id UUID REFERENCES public.user_profiles(id),
    status public.pm_task_status NOT NULL DEFAULT 'todo',
    priority public.pm_task_priority NOT NULL DEFAULT 'medium',
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Time Logs (Optional v1, used for finance later)
CREATE TABLE public.pm_time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    task_id UUID NOT NULL REFERENCES public.pm_tasks(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.user_profiles(id),
    date DATE NOT NULL,
    hours_logged NUMERIC(5,2) NOT NULL CHECK (hours_logged > 0),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- RLS Policies

ALTER TABLE public.pm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_time_logs ENABLE ROW LEVEL SECURITY;

-- Projects
CREATE POLICY "Users can view projects in their org" ON public.pm_projects FOR SELECT 
USING (public.has_active_membership(organization_id));

CREATE POLICY "Org admins can insert projects" ON public.pm_projects FOR INSERT 
WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Org admins can update projects" ON public.pm_projects FOR UPDATE 
USING (public.is_org_admin(organization_id));

-- Tasks
CREATE POLICY "Users can view tasks in their org" ON public.pm_tasks FOR SELECT 
USING (public.has_active_membership(organization_id));

CREATE POLICY "Any active member can insert tasks" ON public.pm_tasks FOR INSERT 
WITH CHECK (public.has_active_membership(organization_id));

CREATE POLICY "Any active member can update tasks" ON public.pm_tasks FOR UPDATE 
USING (public.has_active_membership(organization_id));

-- Time Logs
CREATE POLICY "Users can view time logs in their org" ON public.pm_time_logs FOR SELECT 
USING (public.has_active_membership(organization_id));

CREATE POLICY "Users can log time" ON public.pm_time_logs FOR INSERT 
WITH CHECK (public.has_active_membership(organization_id) AND employee_id = auth.uid());

CREATE POLICY "Users can update their own time logs" ON public.pm_time_logs FOR UPDATE 
USING (public.has_active_membership(organization_id) AND employee_id = auth.uid());


-- Audit Triggers

CREATE TRIGGER audit_pm_projects
AFTER INSERT OR UPDATE OR DELETE ON public.pm_projects
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_pm_tasks
AFTER INSERT OR UPDATE OR DELETE ON public.pm_tasks
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_pm_time_logs
AFTER INSERT OR UPDATE OR DELETE ON public.pm_time_logs
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
