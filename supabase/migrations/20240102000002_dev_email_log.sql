-- Create table for development email logging
CREATE TABLE IF NOT EXISTS public.dev_email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    verification_link TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (default deny all for public access)
ALTER TABLE public.dev_email_logs ENABLE ROW LEVEL SECURITY;

-- Allow admin access (Service Role)
CREATE POLICY "Allow service role access to dev_email_logs" 
ON public.dev_email_logs 
AS PERMISSIVE FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);
