-- Module 7: Attendance Schema

-- 1. attendance_policies
CREATE TABLE public.attendance_policies (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    working_hours_per_day NUMERIC(5,2) DEFAULT 8.0 NOT NULL,
    work_week_pattern JSONB DEFAULT '[1,2,3,4,5]'::jsonb NOT NULL, -- 0=Sun, 1=Mon...
    entry_methods TEXT[] DEFAULT ARRAY['clock_in_out', 'manual']::TEXT[] NOT NULL,
    regularization_window_days INTEGER DEFAULT 7 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.user_profiles(id)
);

-- 2. attendance_records
CREATE TABLE public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.employee_profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    clock_in_time TIMESTAMPTZ,
    clock_out_time TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Half-Day', 'Remote', 'On Leave')),
    is_incomplete BOOLEAN DEFAULT false NOT NULL,
    entry_method TEXT NOT NULL,
    history JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- 3. attendance_corrections
CREATE TABLE public.attendance_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    attendance_record_id UUID REFERENCES public.attendance_records(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employee_profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    requester_id UUID REFERENCES public.user_profiles(id) NOT NULL,
    reason TEXT NOT NULL,
    proposed_clock_in TIMESTAMPTZ,
    proposed_clock_out TIMESTAMPTZ,
    proposed_status TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    approver_id UUID REFERENCES public.user_profiles(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function for updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER tr_attendance_policies_updated_at
BEFORE UPDATE ON public.attendance_policies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER tr_attendance_records_updated_at
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER tr_attendance_corrections_updated_at
BEFORE UPDATE ON public.attendance_corrections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.attendance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;

-- Policies for attendance_policies
CREATE POLICY "Users can view their organization's attendance policies"
ON public.attendance_policies FOR SELECT
USING (organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Admins/Owners can manage attendance policies"
ON public.attendance_policies FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.memberships 
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'org_admin')
  )
);

-- Policies for attendance_records
CREATE POLICY "Users can view attendance records in their organization"
ON public.attendance_records FOR SELECT
USING (organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'));

-- Instead of complex insert/update RLS for employees vs managers vs admins,
-- standard approach is: anyone in the org can insert/update, but backend service enforces RBAC rules.
-- This keeps RLS simple (tenant isolation) and RBAC rich.
CREATE POLICY "Users can insert attendance records in their organization"
ON public.attendance_records FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Users can update attendance records in their organization"
ON public.attendance_records FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'));

-- Policies for attendance_corrections
CREATE POLICY "Users can view corrections in their organization"
ON public.attendance_corrections FOR SELECT
USING (organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Users can manage corrections in their organization"
ON public.attendance_corrections FOR ALL
USING (organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'));
