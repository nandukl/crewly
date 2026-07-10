-- supabase/migrations/20241101000000_marketplace_schema.sql

-- Give Org Admins full write access to their organization's module activations
CREATE POLICY "Owners and Admins can insert module activations" ON public.org_module_activations FOR INSERT 
WITH CHECK (
  public.is_org_admin(organization_id)
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Owners and Admins can update module activations" ON public.org_module_activations FOR UPDATE 
USING (
  public.is_org_admin(organization_id)
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Owners and Admins can delete module activations" ON public.org_module_activations FOR DELETE 
USING (
  public.is_org_admin(organization_id)
  AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- Seed all organizations with all modules active by default so their sidebar doesn't disappear
INSERT INTO public.org_module_activations (organization_id, module_key, is_active)
SELECT o.id, m.module_key, true
FROM public.organizations o
CROSS JOIN (
  VALUES 
    ('attendance'), ('leave'), ('payroll'), ('performance'), 
    ('crm'), ('projects'), ('helpdesk'), ('inventory'), ('finance'), ('analytics')
) AS m(module_key)
ON CONFLICT (organization_id, module_key) DO NOTHING;

