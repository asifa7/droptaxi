# End Ride Flow - Verification Guide

This guide ensures the "End Ride" functionality and strict security guards are working correctly.

## 1. Prerequisites
- **Database**: Run `src/migrations/add_ride_completion_fields.sql`
- **Security**: Run `src/migrations/secure_rls_policies.sql` (Optional but recommended for guards)

## 2. Testing Steps

### Phase A: Setup Ride
1. **Login as Rider**: Enter a phone number (e.g., `9999999999`).
2. **Book Ride**: Request a "Sedan" ride from "Point A" to "Point B".
3. **Login as Driver**: Open a new Profile session or toggle role.
4. **Accept Ride**: You should see the request in Feed. "Accept Request".
5. **Start Ride**: Click "Start Trip". Status becomes `IN_PROGRESS`.

### Phase B: Verify "End Ride"
1. **Check Driver UI**: 
   - The card should have a **Red "End Ride"** button.
   - It should NOT say "Ride in Progress" (Grey/Disabled).
2. **Action**: Click "End Ride".
   - Button should disable or disappear.
   - Status badge should change to `COMPLETED` (Black/Grey).

### Phase C: Verify Rider Feedback
1. **Switch to Rider View**:
   - Wait ~4 seconds (Polling interval).
   - **Expectation**: The "Rating & Feedback" modal appears automatically.
   - **Check**: The **Final Fare** (e.g., ₹450) should be displayed in a green box.

### Phase D: Database Validation
1. Go to Supabase Table Editor > `bookings`.
2. Find the ride row.
3. **Verify Columns**:
   - `status`: `'COMPLETED'`
   - `completed_at`: `timestamp` (Not NULL)
   - `final_fare`: `numeric` (Not NULL, e.g., 450)
   - `final_distance_km`: `numeric` (Not NULL)

## 3. Negative Testing (Guards)
1. **Try to Complete as Another Driver**:
   - If utilizing RLS, logging in as a different driver should NOT show the "End Ride" button for this trip.
2. **Try to Update Completed Ride**:
   - Once `COMPLETED`, further updates should be rejected by the UI checks (and RLS if strict policies applied).
