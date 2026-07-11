-- supabase/migrations/20241201000002_get_public_org_rpc.sql

-- This RPC allows unauthenticated users to fetch public branding information for a tenant login page
-- It uses SECURITY DEFINER to bypass the Row Level Security on the organizations table.

CREATE OR REPLACE FUNCTION public.get_public_org_by_slug(p_slug TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    logo_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT id, name, slug, logo_url
    FROM public.organizations
    WHERE slug = p_slug AND status = 'active';
$$;
