-- supabase/migrations/20260712000003_unify_identity_references.sql

-- Helper Function to resolve current employee profile from auth.uid()
CREATE OR REPLACE FUNCTION public.get_current_employee_id(p_org_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_emp_id UUID;
BEGIN
    SELECT ep.id INTO v_emp_id
    FROM public.employee_profiles ep
    JOIN public.memberships m ON ep.membership_id = m.id
    WHERE m.user_id = auth.uid() AND m.organization_id = p_org_id
    LIMIT 1;
    
    RETURN v_emp_id;
END;
$$;

-- 1. fin_transactions
ALTER TABLE public.fin_transactions DROP CONSTRAINT IF EXISTS fin_transactions_created_by_fkey;
ALTER TABLE public.fin_transactions ADD CONSTRAINT fin_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employee_profiles(id) ON DELETE RESTRICT;

DROP POLICY IF EXISTS "Admins can insert manual transactions" ON public.fin_transactions;
CREATE POLICY "Admins can insert manual transactions" ON public.fin_transactions FOR INSERT WITH CHECK (public.is_org_admin(organization_id) AND created_by = public.get_current_employee_id(organization_id));

-- Update finance ledger trigger to use get_current_employee_id()
CREATE OR REPLACE FUNCTION public.sync_finance_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If Expense is marked PAID
    IF TG_TABLE_NAME = 'fin_expenses' AND NEW.status = 'paid' AND OLD.status != 'paid' THEN
        INSERT INTO public.fin_transactions (organization_id, type, amount, date, reference_id, reference_type, description, created_by)
        VALUES (NEW.organization_id, 'expense', NEW.amount, CURRENT_DATE, NEW.id, 'expense', 'Expense reimbursement for ' || NEW.category, public.get_current_employee_id(NEW.organization_id));
    END IF;

    -- If Invoice is marked PAID
    IF TG_TABLE_NAME = 'fin_invoices' AND NEW.status = 'paid' AND OLD.status != 'paid' THEN
        INSERT INTO public.fin_transactions (organization_id, type, amount, date, reference_id, reference_type, description, created_by)
        VALUES (NEW.organization_id, 'income', NEW.amount, CURRENT_DATE, NEW.id, 'invoice', 'Invoice payment: ' || NEW.invoice_number, public.get_current_employee_id(NEW.organization_id));
    END IF;

    RETURN NEW;
END;
$$;


-- 2. inv_movements
ALTER TABLE public.inv_movements DROP CONSTRAINT IF EXISTS inv_movements_created_by_fkey;
ALTER TABLE public.inv_movements ADD CONSTRAINT inv_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employee_profiles(id) ON DELETE RESTRICT;

DROP POLICY IF EXISTS "Admins can record movements" ON public.inv_movements;
CREATE POLICY "Admins can record movements" ON public.inv_movements FOR INSERT WITH CHECK (public.is_org_admin(organization_id) AND created_by = public.get_current_employee_id(organization_id));

-- 3. payroll_runs
ALTER TABLE public.payroll_runs DROP CONSTRAINT IF EXISTS payroll_runs_run_by_fkey;
ALTER TABLE public.payroll_runs ADD CONSTRAINT payroll_runs_run_by_fkey FOREIGN KEY (run_by) REFERENCES public.employee_profiles(id) ON DELETE RESTRICT;

-- Update payroll generation to use get_current_employee_id()
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
        -- Create new run using get_current_employee_id()
        INSERT INTO public.payroll_runs (organization_id, period_month, period_year, run_by)
        VALUES (p_org_id, p_month, p_year, public.get_current_employee_id(p_org_id))
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


-- 4. leave_types
ALTER TABLE public.leave_types DROP CONSTRAINT IF EXISTS leave_types_updated_by_fkey;
ALTER TABLE public.leave_types ADD CONSTRAINT leave_types_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.employee_profiles(id) ON DELETE SET NULL;

-- 5. leave_balance_transactions
ALTER TABLE public.leave_balance_transactions DROP CONSTRAINT IF EXISTS leave_balance_transactions_created_by_fkey;
ALTER TABLE public.leave_balance_transactions ADD CONSTRAINT leave_balance_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employee_profiles(id) ON DELETE RESTRICT;

-- 6. attendance_policies
ALTER TABLE public.attendance_policies DROP CONSTRAINT IF EXISTS attendance_policies_updated_by_fkey;
ALTER TABLE public.attendance_policies ADD CONSTRAINT attendance_policies_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.employee_profiles(id) ON DELETE SET NULL;

-- 7. attendance_corrections (requester_id, approver_id)
ALTER TABLE public.attendance_corrections DROP CONSTRAINT IF EXISTS attendance_corrections_requester_id_fkey;
ALTER TABLE public.attendance_corrections ADD CONSTRAINT attendance_corrections_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.employee_profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.attendance_corrections DROP CONSTRAINT IF EXISTS attendance_corrections_approver_id_fkey;
ALTER TABLE public.attendance_corrections ADD CONSTRAINT attendance_corrections_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.employee_profiles(id) ON DELETE SET NULL;

-- 8. file_records
-- Drop the old constraint first so we can modify the IDs without violating it
ALTER TABLE public.file_records DROP CONSTRAINT IF EXISTS file_records_uploaded_by_fkey;

-- Data migration: map auth.users(id) to employee_profiles(id) for existing file records
UPDATE public.file_records fr
SET uploaded_by = ep.id
FROM public.memberships m
JOIN public.employee_profiles ep ON ep.membership_id = m.id
WHERE fr.uploaded_by = m.user_id AND fr.organization_id = m.organization_id;

-- Clean up any orphaned records that could not be mapped to avoid constraint violations
DELETE FROM public.file_records
WHERE uploaded_by NOT IN (SELECT id FROM public.employee_profiles);

-- Add the new constraint
ALTER TABLE public.file_records ADD CONSTRAINT file_records_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.employee_profiles(id) ON DELETE RESTRICT;

DROP POLICY IF EXISTS "Users can insert org file records" ON public.file_records;
CREATE POLICY "Users can insert org file records" ON public.file_records FOR INSERT
WITH CHECK (
    public.has_active_membership(organization_id)
    AND uploaded_by = public.get_current_employee_id(organization_id)
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);
