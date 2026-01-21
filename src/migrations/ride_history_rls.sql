-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) FOR RIDE HISTORY
-- ==============================================================================
-- These policies ensure riders and drivers can only see their own completed rides

-- Enable RLS on bookings table (if not already enabled)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- DROP existing history-related policies if they exist
DROP POLICY IF EXISTS "Riders see own rides" ON public.bookings;
DROP POLICY IF EXISTS "Drivers see relevant rides" ON public.bookings;

-- ==============================================================================
-- SELECT POLICIES (Read-Only Access)
-- ==============================================================================

-- Policy 1: Riders can SELECT their own rides
CREATE POLICY "Riders see own rides" ON public.bookings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: Drivers can SELECT rides they're assigned to OR pending rides
CREATE POLICY "Drivers see relevant rides" ON public.bookings
    FOR SELECT
    USING (
        auth.uid() = driver_id 
        OR 
        status IN ('pending', 'REQUESTED')
    );

-- ==============================================================================
-- IMMUTABILITY GUARD (Prevent updates to completed rides)
-- ==============================================================================

-- Ensure existing UPDATE policies exclude COMPLETED rides
-- This prevents any modifications to ride history

-- Note: If you have existing UPDATE policies, make sure they include:
-- WHERE status NOT IN ('COMPLETED', 'completed')
-- 
-- Example:
-- CREATE POLICY "Drivers update active rides" ON public.bookings
--     FOR UPDATE
--     USING (
--         driver_id = auth.uid() 
--         AND status NOT IN ('COMPLETED', 'completed')
--     )
--     WITH CHECK (driver_id = auth.uid());

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- Test 1: Verify a rider can only see their own rides
-- Run as authenticated rider:
-- SELECT * FROM bookings WHERE status = 'COMPLETED';
-- Should return only rides where user_id = auth.uid()

-- Test 2: Verify a driver can only see their assigned rides
-- Run as authenticated driver:
-- SELECT * FROM bookings WHERE status = 'COMPLETED';
-- Should return only rides where driver_id = auth.uid()

-- Test 3: Verify completed rides cannot be updated
-- Try to update a completed ride:
-- UPDATE bookings SET final_fare = 9999 WHERE status = 'COMPLETED';
-- Should fail or return 0 rows affected
