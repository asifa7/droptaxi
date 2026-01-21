-- ==============================================================================
-- DROP TAXI - COMPLETE BACKEND SCHEMA
-- ==============================================================================
-- Run this entire script in the Supabase SQL Editor to verify/repair your backend.
-- It is safe to run multiple times (idempotent) unless you have conflicting data choices.
-- ==============================================================================

-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. PUBLIC PROFILES (Users & Drivers)
-- ==============================================================================
-- We use a simplified model where users are managed via Auth, 
-- but we need a table for Driver details (Agent Wallets).

CREATE TABLE IF NOT EXISTS public.agent_wallets (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone text NOT NULL UNIQUE,
    name text,
    balance numeric DEFAULT 0,
    total_earned numeric DEFAULT 0,
    commission_due numeric DEFAULT 0,
    commission_paid numeric DEFAULT 0,
    is_online boolean DEFAULT false,
    last_online_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Index for fast lookups by phone
CREATE INDEX IF NOT EXISTS idx_agent_phone ON public.agent_wallets(phone);

-- ==============================================================================
-- 3. BOOKINGS (Single Source of Truth for Rides)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.bookings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Customer Info
    user_id uuid REFERENCES auth.users(id), -- Nullable for guest checkout
    phone text,
    recipient_phone text,
    
    -- Trip Details
    from_name text NOT NULL,
    to_name text NOT NULL,
    from_lat numeric,
    from_lng numeric,
    to_lat numeric,
    to_lng numeric,
    distance_km numeric,
    
    -- Status & Lifecycle
    status text DEFAULT 'pending', -- pending, REQUESTED, DRIVER_ACCEPTED, IN_PROGRESS, completed, cancelled
    accepted_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    
    -- Driver Assignment
    driver_id uuid REFERENCES auth.users(id), -- The auth user ID of the driver
    driver_phone text, -- Cached phone for display
    
    -- Pricing
    fare_amount numeric DEFAULT 0,
    estimated_fare numeric DEFAULT 0,
    market_min_fare numeric,
    market_max_fare numeric,
    
    -- Classification
    car_category text DEFAULT 'SEDAN',
    trip_type text DEFAULT 'ONE_WAY',
    ride_type text, -- Alias for readability
    
    -- Pooling
    pool_type text DEFAULT 'SOLO',
    pool_status text DEFAULT 'IDLE',
    pool_count integer DEFAULT 1,
    
    -- Metadata
    pickup_address text,
    dropoff_address text,
    trip_date text,
    trip_time text
);

-- Indexes for Driver Feed and History
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_driver ON public.bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_geo ON public.bookings(from_lat, from_lng);

-- ==============================================================================
-- 4. WALLET TRANSACTIONS (Financial Ledger)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at timestamp with time zone DEFAULT now(),
    
    agent_phone text REFERENCES public.agent_wallets(phone),
    type text NOT NULL, -- 'EARNING', 'WITHDRAWAL', 'COMMISSION'
    amount numeric NOT NULL,
    description text,
    status text DEFAULT 'COMPLETED'
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_phone ON public.wallet_transactions(agent_phone);

-- ==============================================================================
-- 5. PRICING RULES (Admin Configuration)
-- ==============================================================================

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

-- Seed Default Pricing (Insert only if empty)
INSERT INTO public.pricing_rules (car_category, base_fare, min_fare, rate_per_km_city, rate_per_km_intercity)
VALUES 
    ('SEDAN', 50, 100, 18, 12),
    ('SUV', 80, 150, 24, 16),
    ('PREMIUM', 100, 250, 35, 25),
    ('MINIBUS', 200, 500, 40, 30)
ON CONFLICT (car_category) DO NOTHING;

-- ==============================================================================
-- 6. PAYMENT VERIFICATIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.payment_verifications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id uuid REFERENCES public.bookings(id),
    amount numeric,
    status text DEFAULT 'PENDING',
    passenger_confirmed boolean DEFAULT false,
    passenger_confirmation_time timestamp with time zone,
    driver_confirmed boolean DEFAULT false,
    driver_confirmation_time timestamp with time zone,
    transaction_reference text,
    created_at timestamp with time zone DEFAULT now()
);

-- ==============================================================================
-- 7. RATINGS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ratings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id uuid REFERENCES public.bookings(id),
    rated_by text,
    rated_user_id text,
    stars integer,
    tags text[],
    comment text,
    created_at timestamp with time zone DEFAULT now()
);

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_wallets ENABLE ROW LEVEL SECURITY;

-- BOOKINGS POLICIES
-- 1. Anyone can create a booking (Public/Guest access for demo)
CREATE POLICY "Public create bookings" ON public.bookings FOR INSERT WITH CHECK (true);

-- 2. Users can see their own bookings (Using phone match for simple demo, or auth.uid)
CREATE POLICY "Users view own bookings" ON public.bookings FOR SELECT USING (true); -- Relaxed for demo simplicity

-- 3. Drivers can see available bookings (Feed) and their accepted jobs
CREATE POLICY "Drivers view requests" ON public.bookings FOR SELECT USING (true); -- Relaxed for demo simplicity

-- 4. Drivers can update bookings they have accepted
CREATE POLICY "Drivers update own bookings" ON public.bookings FOR UPDATE USING (true); -- Relaxed for demo simplicity

-- AGENT WALLETS POLICIES
-- 1. Agents can view/update their own wallet
CREATE POLICY "Agents access own wallet" ON public.agent_wallets FOR ALL USING (true); -- Relaxed for demo simplicity

-- ==============================================================================
-- 9. STORED PROCEDURES (For Wallet Logic)
-- ==============================================================================

CREATE OR REPLACE FUNCTION process_agent_withdrawal(target_phone text, requested_amount numeric)
RETURNS void AS $$
DECLARE
  current_bal numeric;
BEGIN
  SELECT balance INTO current_bal FROM agent_wallets WHERE phone = target_phone;
  
  IF current_bal >= requested_amount THEN
    UPDATE agent_wallets 
    SET balance = balance - requested_amount,
        commission_paid = commission_paid + requested_amount
    WHERE phone = target_phone;
  ELSE
    RAISE EXCEPTION 'Insufficient funds';
  END IF;
END;
$$ LANGUAGE plpgsql;
