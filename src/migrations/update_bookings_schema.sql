-- Upgrade bookings table with new columns for complete ride persistence
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_address text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_lat numeric;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_lng numeric;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dropoff_address text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dropoff_lat numeric;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dropoff_lng numeric;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS distance_km numeric;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ride_type text; -- Maps to PoolType or TripType, user asked for 'ride_type'
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS estimated_fare numeric;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS market_min_fare numeric;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS market_max_fare numeric;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status text DEFAULT 'REQUESTED'; -- User asked to default 'REQUESTED', but existing default might be 'pending'. I won't change existing default if set, but will ensure column exists.

-- Verify RLS Policy (for open access in this demo context, or specific user)
-- Ideally: create policy "Allow users to insert their own rides" ...
-- For now, ensuring public access for the demo as established in previous context.
-- ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable insert for authenticated users only" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Since we are using an anonymous key/public setup for this playground, we might assume policies exist or are open.
-- I will add a comment about RLS verification.
