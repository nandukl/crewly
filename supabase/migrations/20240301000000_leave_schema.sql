-- Module 8: Leave Management Schema

-- 1. leave_types
CREATE TABLE public.leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    requires_approval BOOLEAN DEFAULT true NOT NULL,
    allows_negative_balance BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.user_profiles(id),
    UNIQUE(organization_id, name)
);

-- 2. leave_requests
CREATE TABLE public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.employee_profiles(id) ON DELETE CASCADE NOT NULL,
    leave_type_id UUID REFERENCES public.leave_types(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count NUMERIC(5,2) NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
    approver_id UUID REFERENCES public.user_profiles(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- 3. leave_balance_transactions (Immutable Ledger)
CREATE TABLE public.leave_balance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.employee_profiles(id) ON DELETE CASCADE NOT NULL,
    leave_type_id UUID REFERENCES public.leave_types(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Accrual', 'Deduction', 'Adjustment')),
    amount NUMERIC(5,2) NOT NULL,
    reference_id UUID, -- Optional link to leave_request_id or manual adjustment run
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id)
);

-- 4. leave_balances_view
-- A view to calculate current balances from the immutable ledger
CREATE OR REPLACE VIEW public.leave_balances_view AS
SELECT 
    lbt.organization_id,
    lbt.employee_id,
    lbt.leave_type_id,
    lt.name AS leave_type_name,
    SUM(CASE WHEN lbt.transaction_type IN ('Accrual', 'Adjustment') AND lbt.amount > 0 THEN lbt.amount ELSE 0 END) AS total_entitled,
    SUM(CASE WHEN lbt.transaction_type = 'Deduction' OR (lbt.transaction_type = 'Adjustment' AND lbt.amount < 0) THEN ABS(lbt.amount) ELSE 0 END) AS total_used,
    SUM(lbt.amount) AS remaining_balance
FROM public.leave_balance_transactions lbt
JOIN public.leave_types lt ON lbt.leave_type_id = lt.id
GROUP BY lbt.organization_id, lbt.employee_id, lbt.leave_type_id, lt.name;

-- Triggers for updated_at
CREATE TRIGGER tr_leave_types_updated_at
BEFORE UPDATE ON public.leave_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER tr_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Row Level Security
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balance_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- leave_types
CREATE POLICY "Users can view leave types in their organization"
ON public.leave_types FOR SELECT
USING (organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Admins/Owners can manage leave types"
ON public.leave_types FOR ALL
USING (organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'org_admin')));

-- leave_requests
CREATE POLICY "Users can view leave requests in their organization"
ON public.leave_requests FOR SELECT
USING (organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'));

-- In v1, allow anyone in org to insert/update, backend Service enforces RBAC (who can submit for whom, who can approve)
CREATE POLICY "Users can create leave requests in their organization"
ON public.leave_requests FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'));

CREATE POLICY "Users can update leave requests in their organization"
ON public.leave_requests FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'));

-- leave_balance_transactions
CREATE POLICY "Users can view balance transactions in their organization"
ON public.leave_balance_transactions FOR SELECT
USING (organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'));

-- Backend strictly creates these, UI should never insert directly. RLS allows org members, backend defends.
CREATE POLICY "Backend can insert balance transactions"
ON public.leave_balance_transactions FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM public.memberships WHERE user_id = auth.uid() AND status = 'active'));
