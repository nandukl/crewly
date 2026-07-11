-- supabase/migrations/20241201000004_fix_user_profiles_columns.sql

-- 1. Add missing columns to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Update the trigger function to populate these from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id, 
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Backfill existing user_profiles with data from auth.users
UPDATE public.user_profiles up
SET 
  full_name = au.raw_user_meta_data->>'name',
  avatar_url = au.raw_user_meta_data->>'avatar_url'
FROM auth.users au
WHERE up.id = au.id
AND up.full_name IS NULL;
