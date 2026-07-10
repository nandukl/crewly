-- supabase/migrations/20240901000000_inventory_schema.sql

-- Inventory Module

CREATE TYPE public.inv_location_type AS ENUM ('warehouse', 'storefront', 'office', 'virtual');
CREATE TYPE public.inv_movement_type AS ENUM ('receipt', 'shipment', 'transfer', 'adjustment');

-- 1. Locations
CREATE TABLE public.inv_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    type public.inv_location_type NOT NULL DEFAULT 'warehouse',
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Items / Catalog
CREATE TABLE public.inv_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    category TEXT,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    min_stock_level INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, sku)
);

-- 3. Stock Levels (Automatically managed via triggers)
CREATE TABLE public.inv_stock_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    item_id UUID NOT NULL REFERENCES public.inv_items(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.inv_locations(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, item_id, location_id)
);

-- 4. Stock Movements (The Ledger)
CREATE TABLE public.inv_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    item_id UUID NOT NULL REFERENCES public.inv_items(id) ON DELETE CASCADE,
    from_location_id UUID REFERENCES public.inv_locations(id), -- Nullable for initial receipt/positive adjustment
    to_location_id UUID REFERENCES public.inv_locations(id),   -- Nullable for shipment/negative adjustment
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    type public.inv_movement_type NOT NULL,
    reference_number TEXT,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger Function to maintain stock levels based on movements
CREATE OR REPLACE FUNCTION public.process_inventory_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Deduct from source location
    IF NEW.from_location_id IS NOT NULL THEN
        -- Upsert to handle potential missing records gracefully (though normally they should exist)
        INSERT INTO public.inv_stock_levels (organization_id, item_id, location_id, quantity)
        VALUES (NEW.organization_id, NEW.item_id, NEW.from_location_id, -NEW.quantity)
        ON CONFLICT (organization_id, item_id, location_id) 
        DO UPDATE SET quantity = public.inv_stock_levels.quantity - EXCLUDED.quantity, updated_at = NOW();
    END IF;

    -- Add to destination location
    IF NEW.to_location_id IS NOT NULL THEN
        INSERT INTO public.inv_stock_levels (organization_id, item_id, location_id, quantity)
        VALUES (NEW.organization_id, NEW.item_id, NEW.to_location_id, NEW.quantity)
        ON CONFLICT (organization_id, item_id, location_id) 
        DO UPDATE SET quantity = public.inv_stock_levels.quantity + EXCLUDED.quantity, updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER process_inventory_movement_trigger
AFTER INSERT ON public.inv_movements
FOR EACH ROW
EXECUTE FUNCTION public.process_inventory_movement();

-- Prevent manual updates/deletes on movements to ensure ledger immutability
CREATE OR REPLACE FUNCTION public.prevent_movement_update_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Inventory movements are immutable. Post a reversing adjustment instead.';
END;
$$;

CREATE TRIGGER immutable_inventory_movements
BEFORE UPDATE OR DELETE ON public.inv_movements
FOR EACH ROW
EXECUTE FUNCTION public.prevent_movement_update_delete();


-- RLS Policies
ALTER TABLE public.inv_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_movements ENABLE ROW LEVEL SECURITY;

-- Locations
CREATE POLICY "Admins can view locations" ON public.inv_locations FOR SELECT USING (public.is_org_admin(organization_id));
CREATE POLICY "Admins can insert locations" ON public.inv_locations FOR INSERT WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "Admins can update locations" ON public.inv_locations FOR UPDATE USING (public.is_org_admin(organization_id));

-- Items
CREATE POLICY "Admins can view items" ON public.inv_items FOR SELECT USING (public.is_org_admin(organization_id));
CREATE POLICY "Admins can insert items" ON public.inv_items FOR INSERT WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "Admins can update items" ON public.inv_items FOR UPDATE USING (public.is_org_admin(organization_id));

-- Stock Levels (Read-only for admins from client side, updated via trigger)
CREATE POLICY "Admins can view stock levels" ON public.inv_stock_levels FOR SELECT USING (public.is_org_admin(organization_id));

-- Movements
CREATE POLICY "Admins can view movements" ON public.inv_movements FOR SELECT USING (public.is_org_admin(organization_id));
CREATE POLICY "Admins can record movements" ON public.inv_movements FOR INSERT WITH CHECK (public.is_org_admin(organization_id) AND created_by = auth.uid());


-- Audit Triggers (Only for master data, movements are self-auditing)
CREATE TRIGGER audit_inv_locations
AFTER INSERT OR UPDATE OR DELETE ON public.inv_locations
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_inv_items
AFTER INSERT OR UPDATE OR DELETE ON public.inv_items
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
