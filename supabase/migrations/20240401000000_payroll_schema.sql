-- supabase/migrations/20240401000000_payroll_schema.sql

-- 1. salary_structures
CREATE TABLE public.salary_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    base_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    allowances JSONB DEFAULT '[]'::jsonb, -- e.g. [{"name": "HRA", "amount": 500, "type": "fixed"}]
    deductions JSONB DEFAULT '[]'::jsonb, -- e.g. [{"name": "Tax", "percentage": 10, "type": "percentage"}]
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- 2. employee_salary_profiles
CREATE TABLE public.employee_salary_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
    salary_structure_id UUID NOT NULL REFERENCES public.salary_structures(id) ON DELETE RESTRICT,
    effective_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, effective_date)
);

-- 3. payroll_runs
CREATE TABLE public.payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
    run_by UUID REFERENCES auth.users(id),
    total_gross NUMERIC(15,2) DEFAULT 0,
    total_net NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, period_month, period_year)
);

-- 4. payslips
CREATE TABLE public.payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employee_profiles(id) ON DELETE CASCADE,
    gross_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
    breakdown JSONB NOT NULL DEFAULT '{}'::jsonb, -- Snapshot of base, allowances, deductions for history
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(payroll_run_id, employee_id)
);

-- RLS POLICIES
ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salary_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

-- salary_structures RLS
CREATE POLICY "Users can view salary structures in their org" ON public.salary_structures FOR SELECT USING (
  public.has_active_membership(organization_id) AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);
CREATE POLICY "Admins can manage salary structures" ON public.salary_structures FOR ALL USING (
  public.has_permission(auth.uid(), organization_id, 'payroll_runs', 'manage') AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
) WITH CHECK (
  public.has_permission(auth.uid(), organization_id, 'payroll_runs', 'manage') AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- employee_salary_profiles RLS
CREATE POLICY "Users can view own salary profile" ON public.employee_salary_profiles FOR SELECT USING (
  (public.has_permission(auth.uid(), organization_id, 'payroll_runs', 'manage') OR employee_id = auth.uid())
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);
CREATE POLICY "Admins can manage salary profiles" ON public.employee_salary_profiles FOR ALL USING (
  public.has_permission(auth.uid(), organization_id, 'payroll_runs', 'manage') AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
) WITH CHECK (
  public.has_permission(auth.uid(), organization_id, 'payroll_runs', 'manage') AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- payroll_runs RLS
CREATE POLICY "Users can view payroll runs in org" ON public.payroll_runs FOR SELECT USING (
  public.has_active_membership(organization_id) AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);
CREATE POLICY "Admins can manage payroll runs" ON public.payroll_runs FOR ALL USING (
  public.has_permission(auth.uid(), organization_id, 'payroll_runs', 'manage') AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
) WITH CHECK (
  public.has_permission(auth.uid(), organization_id, 'payroll_runs', 'manage') AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- payslips RLS
CREATE POLICY "Users can view own payslips" ON public.payslips FOR SELECT USING (
  (public.has_permission(auth.uid(), organization_id, 'payroll_runs', 'manage') OR employee_id = auth.uid())
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);
CREATE POLICY "Admins can manage payslips" ON public.payslips FOR ALL USING (
  public.has_permission(auth.uid(), organization_id, 'payroll_runs', 'manage') AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
) WITH CHECK (
  public.has_permission(auth.uid(), organization_id, 'payroll_runs', 'manage') AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- Stored Procedure to generate a payroll run
CREATE OR REPLACE FUNCTION public.generate_payroll_run(
    p_org_id UUID,
    p_month INT,
    p_year INT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_permission BOOLEAN;
    v_run_id UUID;
    v_total_gross NUMERIC(15,2) := 0;
    v_total_net NUMERIC(15,2) := 0;
    r RECORD;
    v_gross NUMERIC;
    v_net NUMERIC;
    v_allowance_sum NUMERIC;
    v_deduction_sum NUMERIC;
    v_item JSONB;
BEGIN
    -- 1. Check permission
    SELECT public.has_permission(auth.uid(), p_org_id, 'payroll_runs', 'manage') INTO v_has_permission;
    IF NOT v_has_permission THEN
        RAISE EXCEPTION 'Unauthorized to manage payroll runs.';
    END IF;

    -- 2. Check if run exists
    SELECT id INTO v_run_id FROM public.payroll_runs WHERE organization_id = p_org_id AND period_month = p_month AND period_year = p_year;
    
    IF v_run_id IS NOT NULL THEN
        -- If finalized, cannot regenerate
        IF EXISTS (SELECT 1 FROM public.payroll_runs WHERE id = v_run_id AND status = 'finalized') THEN
            RAISE EXCEPTION 'Payroll run for this period is already finalized.';
        END IF;
        
        -- Delete old pending payslips to regenerate
        DELETE FROM public.payslips WHERE payroll_run_id = v_run_id;
    ELSE
        -- Create new run
        INSERT INTO public.payroll_runs (organization_id, period_month, period_year, run_by)
        VALUES (p_org_id, p_month, p_year, auth.uid())
        RETURNING id INTO v_run_id;
    END IF;

    -- 3. Calculate payslips for all active profiles
    FOR r IN (
        SELECT 
            esp.employee_id, 
            ss.base_amount, 
            ss.allowances, 
            ss.deductions
        FROM public.employee_salary_profiles esp
        JOIN public.salary_structures ss ON esp.salary_structure_id = ss.id
        WHERE esp.organization_id = p_org_id AND esp.status = 'active'
          AND esp.effective_date <= (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date
    ) LOOP
        v_gross := r.base_amount;
        v_allowance_sum := 0;
        v_deduction_sum := 0;
        
        -- Calculate allowances
        FOR v_item IN SELECT * FROM jsonb_array_elements(r.allowances) LOOP
            IF (v_item->>'type') = 'fixed' THEN
                v_allowance_sum := v_allowance_sum + (v_item->>'amount')::NUMERIC;
            ELSIF (v_item->>'type') = 'percentage' THEN
                v_allowance_sum := v_allowance_sum + (r.base_amount * ((v_item->>'percentage')::NUMERIC / 100));
            END IF;
        END LOOP;
        
        v_gross := v_gross + v_allowance_sum;
        v_net := v_gross;

        -- Calculate deductions
        FOR v_item IN SELECT * FROM jsonb_array_elements(r.deductions) LOOP
            IF (v_item->>'type') = 'fixed' THEN
                v_deduction_sum := v_deduction_sum + (v_item->>'amount')::NUMERIC;
            ELSIF (v_item->>'type') = 'percentage' THEN
                v_deduction_sum := v_deduction_sum + (r.base_amount * ((v_item->>'percentage')::NUMERIC / 100));
            END IF;
        END LOOP;

        v_net := v_net - v_deduction_sum;

        -- Insert payslip
        INSERT INTO public.payslips (organization_id, payroll_run_id, employee_id, gross_pay, net_pay, breakdown)
        VALUES (
            p_org_id, 
            v_run_id, 
            r.employee_id, 
            v_gross, 
            v_net, 
            jsonb_build_object(
                'base', r.base_amount,
                'allowances', r.allowances,
                'deductions', r.deductions,
                'allowance_total', v_allowance_sum,
                'deduction_total', v_deduction_sum
            )
        );

        v_total_gross := v_total_gross + v_gross;
        v_total_net := v_total_net + v_net;
    END LOOP;

    -- Update run totals
    UPDATE public.payroll_runs 
    SET total_gross = v_total_gross, total_net = v_total_net, updated_at = NOW()
    WHERE id = v_run_id;

    RETURN v_run_id;
END;
$$;
