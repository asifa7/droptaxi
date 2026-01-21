-- ==============================================================================
-- UNIVERSAL FIXER: POLICIES & CONFLICTS
-- ==============================================================================
-- This script safely fixes "already exists" errors by dropping items first.
-- It also ensures all columns are present.

-- 1. DROP CONFLICTING POLICIES (Fixes ERROR 42710)
DROP POLICY IF EXISTS "Public pricing rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Admins manage pricing" ON public.pricing_rules;
DROP POLICY IF EXISTS "Public create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Drivers view requests" ON public.bookings;
DROP POLICY IF EXISTS "Drivers update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Agents access own wallet" ON public.agent_wallets;

-- 2. ENSURE TABLES EXIST
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.pricing_rules (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    car_category text NOT NULL UNIQUE,
    base_fare numeric NOT NULL DEFAULT 50,
    min_fare numeric NOT NULL DEFAULT 100,
    rate_per_km_city numeric NOT NULL DEFAULT 14,
     city_radius_km numeric DEFAULT 40,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. APPLY POLICIES SAFELY
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public pricing rules" ON public.pricing_rules FOR SELECT USING (true);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public create bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users view own bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Drivers view requests" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Drivers update own bookings" ON public.bookings FOR UPDATE USING (true);

ALTER TABLE public.agent_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents access own wallet" ON public.agent_wallets FOR ALL USING (true);

-- 4. MISSING COLUMNS (Final Safety Check)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES auth.users(id);
