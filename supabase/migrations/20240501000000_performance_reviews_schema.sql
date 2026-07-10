-- Migration: Performance Reviews Schema

-- Table: review_cycles
CREATE TABLE public.review_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Draft', 'Active', 'Completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: performance_reviews
CREATE TABLE public.performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES public.review_cycles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Pending Self-Review' CHECK (status IN ('Pending Self-Review', 'Pending Manager Review', 'Completed')),
    self_score NUMERIC,
    manager_score NUMERIC,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cycle_id, reviewee_id)
);

-- Table: performance_goals
CREATE TABLE public.performance_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    employee_rating NUMERIC,
    manager_rating NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;

-- review_cycles
CREATE POLICY "Org members can view review cycles" ON public.review_cycles FOR SELECT
USING (public.has_active_membership(organization_id));

CREATE POLICY "Org admins can manage review cycles" ON public.review_cycles FOR ALL
USING (public.is_org_admin(organization_id));

-- performance_reviews
CREATE POLICY "Org admins can manage performance reviews" ON public.performance_reviews FOR ALL
USING (public.is_org_admin(organization_id));

CREATE POLICY "Reviewee can view their own reviews" ON public.performance_reviews FOR SELECT
USING (
    reviewee_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid() AND organization_id = performance_reviews.organization_id)
);

CREATE POLICY "Reviewer can view assigned reviews" ON public.performance_reviews FOR SELECT
USING (
    reviewer_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid() AND organization_id = performance_reviews.organization_id)
);

CREATE POLICY "Reviewee can update their own review" ON public.performance_reviews FOR UPDATE
USING (
    reviewee_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid() AND organization_id = performance_reviews.organization_id) 
    AND status = 'Pending Self-Review'
);

CREATE POLICY "Reviewer can update assigned reviews" ON public.performance_reviews FOR UPDATE
USING (
    reviewer_id IN (SELECT id FROM public.memberships WHERE user_id = auth.uid() AND organization_id = performance_reviews.organization_id) 
    AND status = 'Pending Manager Review'
);

-- performance_goals
CREATE POLICY "Org admins can manage performance goals" ON public.performance_goals FOR ALL
USING (
    EXISTS (SELECT 1 FROM public.performance_reviews pr WHERE pr.id = review_id AND public.is_org_admin(pr.organization_id))
);

CREATE POLICY "Reviewee can manage goals" ON public.performance_goals FOR ALL
USING (
    review_id IN (
        SELECT id FROM public.performance_reviews WHERE reviewee_id IN (
            SELECT id FROM public.memberships WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Reviewer can manage goals" ON public.performance_goals FOR ALL
USING (
    review_id IN (
        SELECT id FROM public.performance_reviews WHERE reviewer_id IN (
            SELECT id FROM public.memberships WHERE user_id = auth.uid()
        )
    )
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_review_cycles BEFORE UPDATE ON public.review_cycles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_performance_reviews BEFORE UPDATE ON public.performance_reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_performance_goals BEFORE UPDATE ON public.performance_goals FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Apply audit logs if function exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_trigger_func') THEN
        CREATE TRIGGER audit_review_cycles AFTER INSERT OR UPDATE OR DELETE ON public.review_cycles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
        CREATE TRIGGER audit_performance_reviews AFTER INSERT OR UPDATE OR DELETE ON public.performance_reviews FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
        CREATE TRIGGER audit_performance_goals AFTER INSERT OR UPDATE OR DELETE ON public.performance_goals FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
    END IF;
END $$;
