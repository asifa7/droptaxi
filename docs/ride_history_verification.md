# Ride History - Verification Guide

This guide explains how to verify the Ride History feature for both Riders and Drivers.

## Prerequisites

1. **Database**: Ensure `completed_at`, `final_fare`, and `final_distance_km` columns exist in the `bookings` table
2. **RLS Policies**: Run `src/migrations/ride_history_rls.sql` in Supabase SQL Editor
3. **Test Data**: Have at least one completed ride in the database

## Creating Test Data

If you don't have completed rides, create one:

```sql
-- Insert a test completed ride
INSERT INTO bookings (
  user_id, 
  driver_id, 
  "from", 
  "to", 
  status, 
  final_fare, 
  final_distance_km, 
  completed_at,
  created_at
) VALUES (
  '<rider_user_id>',  -- Replace with actual user ID from auth.users
  '<driver_user_id>', -- Replace with actual driver ID from auth.users
  'Bangalore Airport',
  'MG Road, Bangalore',
  'COMPLETED',
  450,
  25.5,
  NOW(),
  NOW() - INTERVAL '1 hour'
);
```

## Verification Steps

### 1. Rider History

**Steps:**
1. Log in as a **Rider** (use phone number authentication)
2. Navigate to the home screen (IDLE state)
3. Scroll down below the booking form

**Expected Results:**
- Section titled "Your Ride History" appears
- Lists all completed rides where `user_id` matches the logged-in rider
- Each ride shows:
  - Pickup → Dropoff addresses
  - Completion date (formatted as "DD MMM YYYY")
  - Final fare (₹ format)
  - Distance (km)
- If no rides: Shows "No rides yet"
- If loading: Shows "Loading ride history..."
- If error: Shows error message in red

**Database Verification:**
```sql
-- Run in Supabase SQL Editor (as the authenticated rider)
SELECT id, "from", "to", final_fare, final_distance_km, completed_at
FROM bookings
WHERE user_id = auth.uid() AND status = 'COMPLETED'
ORDER BY completed_at DESC
LIMIT 20;
```

### 2. Driver History

**Steps:**
1. Log in as a **Driver** (use phone number authentication)
2. Navigate to the home screen (IDLE state)
3. Scroll down below the ride feed

**Expected Results:**
- Section titled "Completed Rides" appears
- Lists all completed rides where `driver_id` matches the logged-in driver
- Each ride shows the same format as rider history
- If no rides: Shows "No rides yet"
- If loading: Shows "Loading completed rides..."
- If error: Shows error message in red

**Database Verification:**
```sql
-- Run in Supabase SQL Editor (as the authenticated driver)
SELECT id, "from", "to", final_fare, final_distance_km, completed_at
FROM bookings
WHERE driver_id = auth.uid() AND status = 'COMPLETED'
ORDER BY completed_at DESC
LIMIT 20;
```

### 3. RLS Correctness

**Test A: Cross-User Access Prevention**

1. Log in as Rider A
2. Note the rides shown in history
3. Log in as Rider B (different user)
4. Verify Rider B does NOT see Rider A's rides

**Test B: Immutability**

Try to modify a completed ride:

```sql
-- This should FAIL or return 0 rows
UPDATE bookings 
SET final_fare = 9999 
WHERE status = 'COMPLETED' 
LIMIT 1;
```

**Test C: Read-Only from UI**

- Verify there are NO buttons or actions on history items
- Verify you cannot edit, delete, or interact with history entries
- History is purely informational

### 4. Edge Cases

**No Rides:**
- Log in as a new user who has never completed a ride
- Expected: "No rides yet" message

**Supabase Error:**
- Temporarily disable network or use invalid credentials
- Expected: Red error message displayed

**Loading State:**
- On slow connections, you should briefly see "Loading..." text
- This should transition to either the list or "No rides yet"

## Expected Database Values

For each completed ride in history:

| Column | Expected Value |
|--------|----------------|
| `status` | `'COMPLETED'` |
| `completed_at` | Valid timestamp (not NULL) |
| `final_fare` | Numeric value > 0 |
| `final_distance_km` | Numeric value > 0 |
| `user_id` | UUID matching the rider |
| `driver_id` | UUID matching the driver |
| `from` | Pickup address string |
| `to` | Dropoff address string |

## Troubleshooting

**History not showing:**
- Check if `userId` state is set (use React DevTools)
- Verify RLS policies are applied
- Check browser console for errors

**Wrong rides showing:**
- Verify RLS policies use `auth.uid()` correctly
- Check that `user_id` and `driver_id` columns have correct UUIDs

**Can't see any rides:**
- Ensure at least one ride has `status = 'COMPLETED'`
- Verify the logged-in user's ID matches `user_id` or `driver_id`
- Check Supabase logs for policy violations
