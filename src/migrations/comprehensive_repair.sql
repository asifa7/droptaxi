-- ==============================================================================
-- COMPREHENSIVE REPAIR SCRIPT (Whack-a-mole Fixer)
-- ==============================================================================
-- This script adds EVERY possible column used in the app to the bookings table.
-- Run this to fix "column X does not exist" errors once and for all.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. BOOKINGS TABLE REPAIR
-- Identity & User
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS recipient_phone text;

-- Location Data
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS from_name text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS to_name text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS from_lat numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS from_lng numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS to_lat numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS to_lng numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_address text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS dropoff_address text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_lat numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_lng numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS dropoff_lat numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS dropoff_lng numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS distance_km numeric;

-- Status & Lifecycle
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS started_at timestamp with time zone;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS trip_date text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS trip_time text;

-- Driver Info
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES auth.users(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS driver_phone text;

-- Financials
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS fare_amount numeric DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS estimated_fare numeric DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS market_min_fare numeric;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS market_max_fare numeric;

-- Categories & Pooling
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS car_category text DEFAULT 'SEDAN';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS trip_type text DEFAULT 'ONE_WAY';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS ride_type text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pool_type text DEFAULT 'SOLO';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pool_status text DEFAULT 'IDLE';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pool_count integer DEFAULT 1;

-- 3. AGENT WALLETS REPAIR
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS last_online_at timestamp with time zone;
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0;
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS total_earned numeric DEFAULT 0;
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS commission_due numeric DEFAULT 0;
ALTER TABLE public.agent_wallets ADD COLUMN IF NOT EXISTS commission_paid numeric DEFAULT 0;

-- 4. ENSURE PRICING RULES EXIST
CREATE TABLE IF NOT EXISTS public.pricing_rules (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    car_category text NOT NULL UNIQUE,
    base_fare numeric NOT NULL DEFAULT 50,
    min_fare numeric NOT NULL DEFAULT 100,
    rate_per_km_city numeric NOT NULL DEFAULT 14,
    rate_per_km_intercity numeric NOT NULL DEFAULT 12,
    rate_per_min numeric NOT NULL DEFAULT 2,
    night_multiplier numeric NOT NULL DEFAULT 1.2,
    surge_multiplier numeric NOT NULL DEFAULT 1.0,
    waiting_rate numeric NOT NULL DEFAULT 2,
    city_radius_km numeric NOT NULL DEFAULT 40,
    created_at timestamp with time zone DEFAULT now()
);
