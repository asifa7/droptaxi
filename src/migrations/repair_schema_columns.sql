-- ==============================================================================
-- REPAIR SCRIPT: FORCE ADD MISSING COLUMNS
-- ==============================================================================
-- Run this to fix the "column does not exist" error.
-- This forces the database to have the columns we need, even if the table already existed.

-- 1. Fix BOOKINGS Table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES auth.users(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS driver_phone text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS started_at timestamp with time zone;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_address text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_lat numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_lng numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS dropoff_address text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS dropoff_lat numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS dropoff_lng numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS distance_km numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS fare_amount numeric DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS car_category text DEFAULT 'SEDAN';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS trip_type text DEFAULT 'ONE_WAY';

-- 2. Fix AGENT_WALLETS Table (just in case)
CREATE TABLE IF NOT EXISTS public.agent_wallets (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS last_online_at timestamp with time zone;
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0;
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS total_earned numeric DEFAULT 0;
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS commission_due numeric DEFAULT 0;
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS commission_paid numeric DEFAULT 0;

-- 3. Ensure UUID extension is separate (usually requires superuser, but good to have)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
