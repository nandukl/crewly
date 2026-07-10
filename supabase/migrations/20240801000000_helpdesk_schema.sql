-- supabase/migrations/20240801000000_helpdesk_schema.sql

-- Help Desk Module

CREATE TYPE public.hd_ticket_status AS ENUM ('open', 'in_progress', 'waiting_on_user', 'resolved', 'closed');
CREATE TYPE public.hd_ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- 1. Tickets
CREATE TABLE public.hd_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    status public.hd_ticket_status NOT NULL DEFAULT 'open',
    priority public.hd_ticket_priority NOT NULL DEFAULT 'medium',
    requester_id UUID NOT NULL REFERENCES public.user_profiles(id),
    assignee_id UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Ticket Messages (Thread)
CREATE TABLE public.hd_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    ticket_id UUID NOT NULL REFERENCES public.hd_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.user_profiles(id),
    message TEXT NOT NULL,
    is_internal_note BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies

ALTER TABLE public.hd_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hd_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Helper to check if someone is an admin
-- (We already have public.is_org_admin(UUID) which checks for 'owner' or 'org_admin')
-- But we might also want to include 'app_admin' or explicit support roles if they existed.
-- For MVP, we'll allow is_org_admin and app_admin. Let's just use is_org_admin for simplicity.

-- Tickets RLS
CREATE POLICY "Admins can view all tickets" ON public.hd_tickets FOR SELECT 
USING (public.is_org_admin(organization_id));

CREATE POLICY "Users can view their own tickets" ON public.hd_tickets FOR SELECT 
USING (requester_id = auth.uid());

CREATE POLICY "Any member can insert a ticket" ON public.hd_tickets FOR INSERT 
WITH CHECK (public.has_active_membership(organization_id) AND requester_id = auth.uid());

CREATE POLICY "Admins can update tickets" ON public.hd_tickets FOR UPDATE 
USING (public.is_org_admin(organization_id));

-- Users can potentially resolve or reopen their own tickets
CREATE POLICY "Users can update their own tickets" ON public.hd_tickets FOR UPDATE 
USING (requester_id = auth.uid());

-- Ticket Messages RLS
CREATE POLICY "Admins can view all messages" ON public.hd_ticket_messages FOR SELECT 
USING (public.is_org_admin(organization_id));

CREATE POLICY "Users can view public messages on their tickets" ON public.hd_ticket_messages FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.hd_tickets WHERE id = ticket_id AND requester_id = auth.uid())
  AND is_internal_note = false
);

CREATE POLICY "Admins can insert any message" ON public.hd_ticket_messages FOR INSERT 
WITH CHECK (public.is_org_admin(organization_id) AND sender_id = auth.uid());

CREATE POLICY "Users can insert public messages on their tickets" ON public.hd_ticket_messages FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.hd_tickets WHERE id = ticket_id AND requester_id = auth.uid())
  AND sender_id = auth.uid()
  AND is_internal_note = false
);

-- Users cannot update messages (immutable log for now)

-- Audit Triggers

CREATE TRIGGER audit_hd_tickets
AFTER INSERT OR UPDATE OR DELETE ON public.hd_tickets
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_hd_ticket_messages
AFTER INSERT OR UPDATE OR DELETE ON public.hd_ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
