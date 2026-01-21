-- Upgrade bookings table with acceptance fields
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_id uuid;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone;
-- Note: driver_phone usually exists, but might not point to auth users table. driver_id is explicit.

-- Ensure we can index by status for fast driver feed queries
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
