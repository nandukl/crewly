-- supabase/migrations/20241001000000_finance_schema.sql

-- Finance & Expenses Module

CREATE TYPE public.fin_expense_status AS ENUM ('pending', 'approved', 'rejected', 'paid');
CREATE TYPE public.fin_invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');
CREATE TYPE public.fin_transaction_type AS ENUM ('income', 'expense');

-- 1. Expenses (Employee reimbursements)
CREATE TABLE public.fin_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    employee_id UUID NOT NULL REFERENCES public.user_profiles(id),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    status public.fin_expense_status NOT NULL DEFAULT 'pending',
    description TEXT,
    receipt_url TEXT, -- Simple text field for MVP as requested
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Invoices (Billing CRM accounts)
CREATE TABLE public.fin_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    account_id UUID NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    status public.fin_invoice_status NOT NULL DEFAULT 'draft',
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, invoice_number)
);

-- 3. Transactions (General Ledger)
CREATE TABLE public.fin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    type public.fin_transaction_type NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    reference_id UUID, -- Nullable, points to invoice or expense if applicable
    reference_type TEXT, -- e.g., 'invoice', 'expense', 'manual'
    description TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: We could use triggers to automatically write to fin_transactions 
-- when an invoice is marked 'paid' or expense marked 'paid'. For MVP, we'll
-- rely on the application layer or let users manually record ledger entries,
-- or implement simple triggers. Let's do simple triggers to keep it robust.

CREATE OR REPLACE FUNCTION public.sync_finance_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If Expense is marked PAID
    IF TG_TABLE_NAME = 'fin_expenses' AND NEW.status = 'paid' AND OLD.status != 'paid' THEN
        INSERT INTO public.fin_transactions (organization_id, type, amount, date, reference_id, reference_type, description, created_by)
        VALUES (NEW.organization_id, 'expense', NEW.amount, CURRENT_DATE, NEW.id, 'expense', 'Expense reimbursement for ' || NEW.category, auth.uid());
    END IF;

    -- If Invoice is marked PAID
    IF TG_TABLE_NAME = 'fin_invoices' AND NEW.status = 'paid' AND OLD.status != 'paid' THEN
        INSERT INTO public.fin_transactions (organization_id, type, amount, date, reference_id, reference_type, description, created_by)
        VALUES (NEW.organization_id, 'income', NEW.amount, CURRENT_DATE, NEW.id, 'invoice', 'Invoice payment: ' || NEW.invoice_number, auth.uid());
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER expense_paid_trigger
AFTER UPDATE ON public.fin_expenses
FOR EACH ROW
EXECUTE FUNCTION public.sync_finance_ledger();

CREATE TRIGGER invoice_paid_trigger
AFTER UPDATE ON public.fin_invoices
FOR EACH ROW
EXECUTE FUNCTION public.sync_finance_ledger();


-- RLS Policies

ALTER TABLE public.fin_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_transactions ENABLE ROW LEVEL SECURITY;

-- Expenses
CREATE POLICY "Admins can view all expenses" ON public.fin_expenses FOR SELECT USING (public.is_org_admin(organization_id));
CREATE POLICY "Users can view own expenses" ON public.fin_expenses FOR SELECT USING (employee_id = auth.uid());
CREATE POLICY "Users can insert own expenses" ON public.fin_expenses FOR INSERT WITH CHECK (employee_id = auth.uid());
CREATE POLICY "Users can update own pending expenses" ON public.fin_expenses FOR UPDATE USING (employee_id = auth.uid() AND status = 'pending');
CREATE POLICY "Admins can update expenses" ON public.fin_expenses FOR UPDATE USING (public.is_org_admin(organization_id));

-- Invoices (Admins only)
CREATE POLICY "Admins can view invoices" ON public.fin_invoices FOR SELECT USING (public.is_org_admin(organization_id));
CREATE POLICY "Admins can insert invoices" ON public.fin_invoices FOR INSERT WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "Admins can update invoices" ON public.fin_invoices FOR UPDATE USING (public.is_org_admin(organization_id));

-- Transactions (Admins only, mostly read-only except for manual entries)
CREATE POLICY "Admins can view transactions" ON public.fin_transactions FOR SELECT USING (public.is_org_admin(organization_id));
CREATE POLICY "Admins can insert manual transactions" ON public.fin_transactions FOR INSERT WITH CHECK (public.is_org_admin(organization_id) AND created_by = auth.uid());

-- Audit Triggers
CREATE TRIGGER audit_fin_expenses
AFTER INSERT OR UPDATE OR DELETE ON public.fin_expenses
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_fin_invoices
AFTER INSERT OR UPDATE OR DELETE ON public.fin_invoices
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
