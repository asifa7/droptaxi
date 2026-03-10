-- ==============================================================================
-- EMERGENCY FIX: TABLES & COLUMNS ONLY (NO POLICIES)
-- ==============================================================================
-- Since you are seeing "Policy already exists" errors, it means your security rules are ALREADY set.
-- We will skip them and focus ONLY on ensuring your Tables and Columns are correct.
-- Run this script to finish fixing the "missing column" errors.

-- 1. Ensure Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Fix AGENT_WALLETS Table
CREATE TABLE IF NOT EXISTS public.agent_wallets (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now()
);

-- Force add columns (safe to run even if they exist)
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0;
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS total_earned numeric DEFAULT 0;
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS commission_due numeric DEFAULT 0;
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS commission_paid numeric DEFAULT 0;
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS last_online_at timestamp with time zone;
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 3. Fix BOOKINGS Table
-- Identity
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS recipient_phone text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES auth.users(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS driver_phone text;

-- Trip Details
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS start_time timestamp with time zone;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS end_time timestamp with time zone;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS started_at timestamp with time zone;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS fare_amount numeric DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pool_type text DEFAULT 'SOLO';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pool_status text DEFAULT 'IDLE';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pool_count integer DEFAULT 1;

-- Location
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS from_lat numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS from_lng numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS to_lat numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS to_lng numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_address text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS dropoff_address text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS distance_km numeric;

-- 4. Fix PRICING RULES Table
CREATE TABLE IF NOT EXISTS public.pricing_rules (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    car_category text NOT NULL UNIQUE,
    base_fare numeric NOT NULL DEFAULT 50,
    created_at timestamp with time zone DEFAULT now()
);

-- Add any missing pricing columns
ALTER TABLE public.pricing_rules ADD COLUMN IF NOT EXISTS min_fare numeric DEFAULT 100;
ALTER TABLE public.pricing_rules ADD COLUMN IF NOT EXISTS rate_per_km_city numeric DEFAULT 14;
ALTER TABLE public.pricing_rules ADD COLUMN IF NOT EXISTS rate_per_km_intercity numeric DEFAULT 12;
ALTER TABLE public.pricing_rules ADD COLUMN IF NOT EXISTS city_radius_km numeric DEFAULT 40;

-- DONE.
