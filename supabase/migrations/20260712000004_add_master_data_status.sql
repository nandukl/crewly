-- supabase/migrations/20260712000004_add_master_data_status.sql

-- Add status column to core master data entities for soft-deactivation/archiving

-- 1. Departments
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- 2. Custom Roles
ALTER TABLE public.custom_roles ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- 3. CRM Contacts
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- 4. Inventory Items
ALTER TABLE public.inv_items ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- 5. Inventory Locations
ALTER TABLE public.inv_locations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
