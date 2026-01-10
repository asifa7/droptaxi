
import { createClient } from '@supabase/supabase-js';
import { BookingDetails, PoolStatus, PoolType } from './types';

/**
 * DATABASE MIGRATION SCRIPT (Run this in Supabase SQL Editor):
 * 
 * -- 1. If 'bookings' table exists, add missing columns safely
 * ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pool_type text DEFAULT 'SOLO'::text;
 * ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pool_status text DEFAULT 'IDLE'::text;
 * ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pool_count int DEFAULT 1;
 * ALTER TABLE bookings ADD COLUMN IF NOT EXISTS leader_id uuid;
 * ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expiry_at timestamp with time zone;
 * ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stops_data jsonb;
 * ALTER TABLE bookings ADD COLUMN IF NOT EXISTS car_category text;
 * ALTER TABLE bookings ADD COLUMN IF NOT EXISTS trip_type text;
 * ALTER TABLE bookings ADD COLUMN IF NOT EXISTS trip_date text;
 * ALTER TABLE bookings ADD COLUMN IF NOT EXISTS trip_time text;
 * ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_phone text;
 * ALTER TABLE bookings ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone;
 * 
 * -- 2. Create RPC function for atomic pool updates
 * CREATE OR REPLACE FUNCTION increment_pool_count(row_id uuid)
 * RETURNS jsonb
 * LANGUAGE plpgsql
 * SECURITY DEFINER
 * AS $$
 * DECLARE
 *   updated_row bookings%ROWTYPE;
 * BEGIN
 *   UPDATE bookings
 *   SET 
 *     pool_count = COALESCE(pool_count, 1) + 1,
 *     pool_status = CASE 
 *       WHEN (COALESCE(pool_count, 1) + 1) >= 3 THEN 'LOCKED' 
 *       ELSE 'FILLING' 
 *     END
 *   WHERE id = row_id
 *   RETURNING * INTO updated_row;
 *   
 *   RETURN to_jsonb(updated_row);
 * END;
 * $$;
 */

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 
                    process.env.SUPABASE_URL || 
                    'https://cpasvgirgmvhlxltybob.supabase.co';

const supabaseAnonKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 
                        process.env.SUPABASE_ANON_KEY || 
                        'sb_publishable_6r7e9D3R4INhYvFABGiHEA_w0fk0ZQ8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && 
         !supabaseUrl.includes('placeholder-project') &&
         !!supabaseAnonKey;
};

const stringifyError = (err: any): string => {
  if (!err) return "Unknown database error";
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  if (err.details) return `${err.details} (${err.hint || ''})`;
  if (err.code) return `Database Error ${err.code}`;
  return String(err);
};

export const supabaseService = {
  // --- AUTH METHODS ---
  async sendOTP(phone: string) {
    if (!isSupabaseConfigured()) throw new Error("Supabase configuration missing.");
    const digits = phone.replace(/\D/g, '');
    const formattedPhone = digits.length > 10 ? `+${digits}` : `+91${digits.slice(-10)}`;
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
      options: { channel: 'sms' }
    });
    if (error) throw new Error(stringifyError(error));
    return data;
  },

  async verifyOTP(phone: string, token: string) {
    const digits = phone.replace(/\D/g, '');
    const formattedPhone = digits.length > 10 ? `+${digits}` : `+91${digits.slice(-10)}`;
    const { data: { session }, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token,
      type: 'sms',
    });
    if (error) throw new Error(stringifyError(error));
    return session;
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  // --- RIDE & POOLING METHODS ---
  async getPendingRides() {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw new Error(stringifyError(error));
    return data || [];
  },

  async findMatchingPool(fromLat: number, fromLng: number, poolType: PoolType) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('pool_type', poolType)
      .eq('pool_status', 'WAITING')
      .lt('pool_count', 3)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) return null;
    return data && data.length > 0 ? data[0] : null;
  },

  async createRideRequest(booking: BookingDetails) {
    const isPool = booking.poolType !== PoolType.SOLO;
    const expiryAt = isPool ? new Date(Date.now() + 90 * 1000).toISOString() : null;

    const payload: any = {
      from_name: booking.from || 'Unknown Location',
      to_name: booking.to || 'Unknown Destination',
      from_lat: booking.fromCoords?.lat ?? null,
      from_lng: booking.fromCoords?.lng ?? null,
      to_lat: booking.toCoords?.lat ?? null,
      to_lng: booking.toCoords?.lng ?? null,
      status: 'pending',
      car_category: String(booking.carCategory || 'SEDAN'),
      trip_type: String(booking.tripType || 'ONE_WAY'),
      phone: booking.phone || '',
      trip_date: booking.date || '',
      trip_time: booking.time || '',
      stops_data: booking.stops.length > 0 ? JSON.stringify(booking.stops) : null,
      pool_type: booking.poolType,
      pool_status: isPool ? 'WAITING' : 'IDLE',
      pool_count: 1,
      expiry_at: expiryAt
    };

    const { data, error } = await supabase
      .from('bookings')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("Supabase Create Error:", JSON.stringify(error, null, 2));
      throw new Error(stringifyError(error));
    }
    return data;
  },

  async joinPool(poolId: string) {
    // Atomic increment using the RPC defined above
    const { data, error } = await supabase.rpc('increment_pool_count', { row_id: poolId });
    
    if (error) {
      console.warn("RPC joinPool failed, falling back to manual update:", error);
      const { data: updateData, error: updateError } = await supabase
        .from('bookings')
        .update({ 
          pool_count: 2, 
          pool_status: 'FILLING' 
        })
        .eq('id', poolId)
        .select()
        .single();
        
      if (updateError) throw new Error(stringifyError(updateError));
      return updateData;
    }
    return data;
  },

  async acceptRide(id: string, driverPhone: string) {
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        status: 'accepted',
        driver_phone: driverPhone,
        accepted_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select()
      .maybeSingle();

    if (error) throw new Error(stringifyError(error));
    if (!data) throw new Error("RIDE_ALREADY_TAKEN");
    return data;
  }
};
