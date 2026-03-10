-- ROW LEVEL SECURITY (RLS) FOR RIDE HISTORY
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Riders see own rides" ON public.bookings;
DROP POLICY IF EXISTS "Drivers see relevant rides" ON public.bookings;

-- Riders can SELECT their own rides
CREATE POLICY "Riders see own rides" ON public.bookings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Drivers can SELECT rides they're assigned to OR pending rides
CREATE POLICY "Drivers see relevant rides" ON public.bookings
    FOR SELECT
    USING (
        auth.uid() = driver_id 
        OR 
        status IN ('pending', 'REQUESTED')
    );
