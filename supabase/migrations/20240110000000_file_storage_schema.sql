-- supabase/migrations/20240110000000_file_storage_schema.sql

-- 1. Create file_records table for Postgres metadata tracking
CREATE TABLE public.file_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    feature_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_size BIGINT NOT NULL,
    content_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for file_records
ALTER TABLE public.file_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org file records" ON public.file_records FOR SELECT
USING (
    public.has_active_membership(organization_id)
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Users can insert org file records" ON public.file_records FOR INSERT
WITH CHECK (
    public.has_active_membership(organization_id)
    AND auth.uid() = uploaded_by
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Org Admins can delete file records" ON public.file_records FOR DELETE
USING (
    public.is_org_admin(organization_id)
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

-- Attach the generic audit trigger from Module 4
CREATE TRIGGER tr_audit_file_records
AFTER INSERT OR UPDATE OR DELETE ON public.file_records
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 2. Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('workspaces', 'workspaces', false, 10485760) -- 10MB limit
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS Policies
-- Path structure: {organization_id}/{feature_name}/{file_name}
-- storage.foldername(name)[1] extracts the organization_id from the path

CREATE POLICY "Users can view workspace files for their org" ON storage.objects FOR SELECT
USING (
    bucket_id = 'workspaces' 
    AND public.has_active_membership(NULLIF((storage.foldername(name))[1], '')::uuid)
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Users can upload workspace files for their org" ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'workspaces' 
    AND public.has_active_membership(NULLIF((storage.foldername(name))[1], '')::uuid)
    AND auth.uid() = owner
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Users can update workspace files for their org" ON storage.objects FOR UPDATE
USING (
    bucket_id = 'workspaces' 
    AND public.has_active_membership(NULLIF((storage.foldername(name))[1], '')::uuid)
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);

CREATE POLICY "Org Admins can delete workspace files" ON storage.objects FOR DELETE
USING (
    bucket_id = 'workspaces' 
    AND public.is_org_admin(NULLIF((storage.foldername(name))[1], '')::uuid)
    AND NOT public.is_session_revoked((auth.jwt()->>'session_id')::uuid)
);
