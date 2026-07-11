-- supabase/migrations/20241201000003_public_assets_bucket.sql

-- 1. Create a public bucket for branding and logos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('public_assets', 'public_assets', true, 10485760) -- 10MB limit
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS Policies for public_assets
CREATE POLICY "Public can view public_assets" ON storage.objects FOR SELECT
USING (bucket_id = 'public_assets');

CREATE POLICY "Users can upload to public_assets" ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'public_assets' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update public_assets" ON storage.objects FOR UPDATE
USING (
    bucket_id = 'public_assets' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete public_assets" ON storage.objects FOR DELETE
USING (
    bucket_id = 'public_assets' 
    AND auth.role() = 'authenticated'
);
