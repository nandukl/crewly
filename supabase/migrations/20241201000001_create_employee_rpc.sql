-- supabase/migrations/20241201000001_create_employee_rpc.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Secure function to allow Org Admins to create employee accounts directly
CREATE OR REPLACE FUNCTION public.create_employee_account(
  org_id UUID,
  emp_email TEXT,
  emp_password TEXT,
  emp_name TEXT,
  emp_role TEXT
) RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- 1. Verify the caller is an admin of the org
  IF NOT public.is_org_admin(org_id) THEN
    RAISE EXCEPTION 'Only organization admins can create employees';
  END IF;

  -- 2. Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = emp_email) THEN
    RAISE EXCEPTION 'Email already registered';
  END IF;

  -- 3. Insert into auth.users 
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    emp_email,
    extensions.crypt(emp_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', emp_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO new_user_id;

  -- Note: The insert into auth.users will automatically trigger the 
  -- handle_new_user() trigger which creates the user_profiles row.

  -- 4. Insert into memberships
  INSERT INTO public.memberships (organization_id, user_id, email, role, status)
  VALUES (org_id, new_user_id, emp_email, emp_role::public.membership_role, 'active'::public.membership_status);

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.create_employee_account(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
