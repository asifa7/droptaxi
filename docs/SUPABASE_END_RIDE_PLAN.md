# Supabase Implementation Plan: End Ride & Fare Lock

This document outlines the strict database changes required to implement the "End Ride" flow with fare locking and immutability.

## 1. Database Schema Migration
We need to add columns to the `bookings` table to store the final snapshot of the ride. We use `bookings` as the table name (mapped from `rides` in requirements).

### SQL Command
```sql
-- Add completion fields if they don't exist
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS final_fare numeric,
ADD COLUMN IF NOT EXISTS final_distance_km numeric;
```

## 2. Security & Guards (Row Level Security)
These policies are **CRITICAL**. They enforce that:
1.  Only the assigned driver can act.
2.  Rides cannot be double-completed.
3.  Completed rides are **immutable** (cannot be changed).

### SQL Command (Reset & Apply Strict Rules)
```sql
-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 1. READ: Drivers can see their own rides or available requests
CREATE POLICY "Drivers select own or pending" ON public.bookings
FOR SELECT USING (
  (driver_id = auth.uid()) OR (status IN ('pending', 'REQUESTED'))
);

-- 2. UPDATE: Drivers can ONLY update ACTIVE rides (Immutable Guard)
-- 'USING' determines which rows can be targeted for update.
-- We EXCLUDE 'COMPLETED' status here -> making them immutable.
CREATE POLICY "Drivers update active rides" ON public.bookings
FOR UPDATE
USING (
  driver_id = auth.uid() 
  AND status NOT IN ('COMPLETED', 'completed')
)
WITH CHECK (
  driver_id = auth.uid() -- Ensure they don't unassign themselves
);

-- 3. UPDATE: Drivers can CLAIM pending rides
CREATE POLICY "Drivers claim pending" ON public.bookings
FOR UPDATE
USING (status IN ('pending', 'REQUESTED'))
WITH CHECK (
  driver_id = auth.uid() 
  AND status = 'DRIVER_ACCEPTED'
);
```

## 3. Data Integrity Checks (Optional but Recommended)
To prevent "final_fare" being NULL when status is "COMPLETED", we can add a database constraint.

### SQL Command
```sql
ALTER TABLE public.bookings 
ADD CONSTRAINT check_completion_data 
CHECK (
  (status != 'COMPLETED') OR 
  (status = 'COMPLETED' AND final_fare IS NOT NULL AND completed_at IS NOT NULL)
);
```

## 4. Verification Checklist
After applying these changes:
1.  **Test Immutability**: Try to update a `COMPLETED` ride via the Supabase Table Editor or App. It should fail (or return 0 rows affected).
2.  **Test Ownership**: Try to complete a ride as a different user. It should fail.
3.  **Test Data**: Ensure `final_fare` matches the snapshot value (not re-calculated).
