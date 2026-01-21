-- Add completion fields to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_fare numeric;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_distance_km numeric;
