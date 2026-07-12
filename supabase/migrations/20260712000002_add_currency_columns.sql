-- supabase/migrations/20260712000002_add_currency_columns.sql

-- Finance Schema
ALTER TABLE public.fin_expenses ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE public.fin_invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE public.fin_transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Inventory Schema
ALTER TABLE public.inv_items ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- CRM Schema
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Payroll Schema
ALTER TABLE public.salary_structures ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
