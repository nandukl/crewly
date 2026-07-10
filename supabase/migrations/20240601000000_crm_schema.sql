-- Migration: Module 10 CRM Schema

-- Table: crm_accounts
CREATE TABLE public.crm_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    industry TEXT,
    website TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: crm_contacts
CREATE TABLE public.crm_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.crm_accounts(id) ON DELETE SET NULL, -- Nullable for B2C/Orphaned contacts
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    job_title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: crm_deals
CREATE TABLE public.crm_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    amount NUMERIC(12,2) DEFAULT 0.00,
    stage TEXT NOT NULL DEFAULT 'Lead' CHECK (stage IN ('Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost')),
    expected_close_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: crm_activities
CREATE TABLE public.crm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES public.crm_deals(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('Note', 'Call', 'Meeting', 'Email')),
    description TEXT NOT NULL,
    performed_by UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.crm_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

-- Allow read/write for any active member of the org (Basic v1 RBAC)
-- crm_accounts
CREATE POLICY "Org members can view crm accounts" ON public.crm_accounts FOR SELECT USING (public.has_active_membership(organization_id));
CREATE POLICY "Org members can insert crm accounts" ON public.crm_accounts FOR INSERT WITH CHECK (public.has_active_membership(organization_id));
CREATE POLICY "Org members can update crm accounts" ON public.crm_accounts FOR UPDATE USING (public.has_active_membership(organization_id));

-- crm_contacts
CREATE POLICY "Org members can view crm contacts" ON public.crm_contacts FOR SELECT USING (public.has_active_membership(organization_id));
CREATE POLICY "Org members can insert crm contacts" ON public.crm_contacts FOR INSERT WITH CHECK (public.has_active_membership(organization_id));
CREATE POLICY "Org members can update crm contacts" ON public.crm_contacts FOR UPDATE USING (public.has_active_membership(organization_id));

-- crm_deals
CREATE POLICY "Org members can view crm deals" ON public.crm_deals FOR SELECT USING (public.has_active_membership(organization_id));
CREATE POLICY "Org members can insert crm deals" ON public.crm_deals FOR INSERT WITH CHECK (public.has_active_membership(organization_id));
CREATE POLICY "Org members can update crm deals" ON public.crm_deals FOR UPDATE USING (public.has_active_membership(organization_id));

-- crm_activities
CREATE POLICY "Org members can view crm activities" ON public.crm_activities FOR SELECT USING (public.has_active_membership(organization_id));
CREATE POLICY "Org members can insert crm activities" ON public.crm_activities FOR INSERT WITH CHECK (public.has_active_membership(organization_id));
CREATE POLICY "Org members can update crm activities" ON public.crm_activities FOR UPDATE USING (public.has_active_membership(organization_id));

-- Triggers for updated_at
-- Reuses the set_updated_at() function typically defined in initial migrations
CREATE TRIGGER set_updated_at_crm_accounts BEFORE UPDATE ON public.crm_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_crm_contacts BEFORE UPDATE ON public.crm_contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_crm_deals BEFORE UPDATE ON public.crm_deals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_crm_activities BEFORE UPDATE ON public.crm_activities FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Apply audit logs if function exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_trigger_func') THEN
        CREATE TRIGGER audit_crm_accounts AFTER INSERT OR UPDATE OR DELETE ON public.crm_accounts FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
        CREATE TRIGGER audit_crm_contacts AFTER INSERT OR UPDATE OR DELETE ON public.crm_contacts FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
        CREATE TRIGGER audit_crm_deals AFTER INSERT OR UPDATE OR DELETE ON public.crm_deals FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
        CREATE TRIGGER audit_crm_activities AFTER INSERT OR UPDATE OR DELETE ON public.crm_activities FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
    END IF;
END $$;
