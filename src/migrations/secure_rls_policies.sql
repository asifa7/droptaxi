-- ==============================================================================
-- STRICT ROW LEVEL SECURITY (RLS) FOR RIDE LIFECYCLE
-- ==============================================================================
-- Run this to enforce "Only assigned driver can complete ride" and other safety rules.

-- 1. Reset Policies
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can do anything" ON public.bookings;
-- Drop previous specific ones if they exist
DROP POLICY IF EXISTS "Users see own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Drivers see pending bookings" ON public.bookings;
DROP POLICY IF EXISTS "Drivers see assigned bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Drivers accept rides" ON public.bookings;
DROP POLICY IF EXISTS "Drivers update own rides" ON public.bookings;

-- 2. READ (SELECT)
-- Riders see their own rides
CREATE POLICY "Riders see own rides" ON public.bookings
    FOR SELECT USING (auth.uid() = user_id);

-- Drivers see open requests OR rides they are assigned to
CREATE POLICY "Drivers see relevant rides" ON public.bookings
    FOR SELECT USING (
        status IN ('pending', 'REQUESTED') 
        OR 
        driver_id = auth.uid()
    );

-- 3. WRITE (INSERT)
-- Authenticated users can create rides
CREATE POLICY "Riders create rides" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. UPDATE (CRITICAL GUARDS)

-- Case A: Driver Accepting a Ride
-- Logic: Can update IF currently pending AND setting themselves as driver
CREATE POLICY "Drivers claim rides" ON public.bookings
    FOR UPDATE
    USING (status IN ('pending', 'REQUESTED'))
    WITH CHECK (
        driver_id = auth.uid() 
        AND status = 'DRIVER_ACCEPTED'
    );

-- Case B: Driver Progressing Their Ride (Start/Complete)
-- Logic: Can update IF they are the driver
CREATE POLICY "Drivers update progress" ON public.bookings
    FOR UPDATE
    USING (driver_id = auth.uid())
    WITH CHECK (driver_id = auth.uid()); -- Ensures they don't unassign themselves

-- Case C: User Cancelling (Optional for strict completion scope, but good to have)
CREATE POLICY "Riders can cancel" ON public.bookings
    FOR UPDATE
    USING (user_id = auth.uid() AND status IN ('pending', 'REQUESTED'))
    WITH CHECK (status = 'CANCELLED');

-- 5. AGENT WALLETS SECURITY
ALTER TABLE public.agent_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agents manage own wallet" ON public.agent_wallets;

-- We rely on phone number mapping usually, but ideally we link to auth.users. 
-- For this scope, assuming phone-based auth or relaxed wallet RLS:
CREATE POLICY "Agents manage own wallet" ON public.agent_wallets
    FOR ALL USING (true); -- Placeholder: In prod, link agent_wallets.id to auth.users

