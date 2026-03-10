-- Add started_at timestamp to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS started_at timestamp with time zone;
