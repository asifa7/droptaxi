-- Add fare_amount and other pool-related columns to bookings table if they don't exist
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fare_amount numeric DEFAULT 0;

-- Also ensuring pool columns exist as they act together in the logic
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pool_type text DEFAULT 'SOLO';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pool_status text DEFAULT 'IDLE';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pool_count integer DEFAULT 1;

-- Update RLS if needed (optional, just ensuring public access for demo)
-- CREATE POLICY "Public bookings access" ON bookings FOR ALL USING (true);
