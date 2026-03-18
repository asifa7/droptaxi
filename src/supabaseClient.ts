
import { createClient } from '@supabase/supabase-js';
import { BookingDetails, PoolStatus, PoolType, RatingData } from './types';

/**
 * DATABASE MIGRATION SCRIPT (Update):
 * 
 * -- Create payment verifications table
 * CREATE TABLE IF NOT EXISTS payment_verifications (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   booking_id uuid REFERENCES bookings(id),
 *   passenger_confirmed boolean DEFAULT false,
 *   driver_confirmed boolean DEFAULT false,
 *   passenger_confirmation_time timestamp with time zone,
 *   driver_confirmation_time timestamp with time zone,
 *   transaction_reference text,
 *   amount numeric,
 *   status text DEFAULT 'PENDING',
 *   created_at timestamp with time zone DEFAULT now()
 * );
 * 
 * -- Create ratings table
 * CREATE TABLE IF NOT EXISTS ratings (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   booking_id uuid REFERENCES bookings(id),
 *   rated_by text, -- 'USER' or 'DRIVER'
 *   rated_user_id text,
 *   stars integer CHECK (stars >= 1 AND stars <= 5),
 *   tags text[],
 *   comment text,
 *   created_at timestamp with time zone DEFAULT now()
 * );
 * 
 * -- Update agent_wallets table
 * ALTER TABLE agent_wallets ADD COLUMN IF NOT EXISTS commission_due numeric DEFAULT 0;
 * ALTER TABLE agent_wallets ADD COLUMN IF NOT EXISTS commission_paid numeric DEFAULT 0;
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
  return String(err);
};

/**
 * PRICING RULES TABLE
 * 
 * CREATE TABLE IF NOT EXISTS pricing_rules (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   car_category text NOT NULL UNIQUE,
 *   base_fare numeric NOT NULL DEFAULT 50,
 *   min_fare numeric NOT NULL DEFAULT 100,
 *   rate_per_km_city numeric NOT NULL DEFAULT 14,
 *   rate_per_km_intercity numeric NOT NULL DEFAULT 12,
 *   rate_per_min numeric NOT NULL DEFAULT 2,
 *   night_multiplier numeric NOT NULL DEFAULT 1.2,
 *   surge_multiplier numeric NOT NULL DEFAULT 1.0,
 *   waiting_rate numeric NOT NULL DEFAULT 2,
 *   city_radius_km numeric NOT NULL DEFAULT 40,
 *   created_at timestamp with time zone DEFAULT now()
 * );
 * 
 * -- Seed some data
 * INSERT INTO pricing_rules (car_category, base_fare, min_fare, rate_per_km_city, rate_per_km_intercity, rate_per_min) VALUES
 * ('SEDAN', 50, 100, 18, 12, 2),
 * ('SUV', 80, 150, 24, 16, 3),
 * ('PREMIUM', 100, 250, 35, 25, 5),
 * ('MINIBUS', 200, 500, 40, 30, 5)
 * ON CONFLICT (car_category) DO NOTHING;
 */

export const supabaseService = {
  async fetchPricingRules() {
    const { data, error } = await supabase
      .from('pricing_rules')
      .select('*');
    // If table doesn't exist or error, return null so we use defaults
    if (error) {
      console.warn("Could not fetch pricing rules (using defaults):", error.message);
      return null;
    }
    return data;
  },

  subscribeToPricingUpdates(callback: (payload: any) => void) {
    return supabase
      .channel('pricing_rules_updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pricing_rules' },
        callback
      )
      .subscribe();
  },

  async getPendingRides() {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      // Retrieve both historical 'pending' and new 'REQUESTED' status
      .in('status', ['pending', 'REQUESTED'])
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

  async joinPool(id: string) {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        pool_count: 2,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(stringifyError(error));
    return data;
  },

  async createRideRequest(booking: BookingDetails) {
    const isPool = booking.poolType !== PoolType.SOLO;
    const payload: any = {
      from_name: booking.from,
      to_name: booking.to,
      from_lat: booking.fromCoords?.lat ?? null,
      from_lng: booking.fromCoords?.lng ?? null,
      to_lat: booking.toCoords?.lat ?? null,
      to_lng: booking.toCoords?.lng ?? null,

      // New requested columns for persistence
      pickup_address: booking.from,
      pickup_lat: booking.fromCoords?.lat ?? null,
      pickup_lng: booking.fromCoords?.lng ?? null,
      dropoff_address: booking.to,
      dropoff_lat: booking.toCoords?.lat ?? null,
      dropoff_lng: booking.toCoords?.lng ?? null,
      distance_km: booking.distanceKm ?? 0,
      ride_type: booking.tripType || 'ONE_WAY',
      estimated_fare: booking.fareAmount ?? 0,
      market_min_fare: booking.marketMinFare ?? 0,
      market_max_fare: booking.marketMaxFare ?? 0,

      status: 'pending', // maintaining 'pending' for creation as requested by user's strict logic elsewhere, but queried as pending/REQUESTED
      car_category: String(booking.carCategory || 'SEDAN'),
      trip_type: String(booking.tripType || 'ONE_WAY'),
      phone: booking.phone || '',
      trip_date: booking.date || '',
      trip_time: booking.time || '',
      pool_type: booking.poolType,
      pool_status: isPool ? 'WAITING' : 'IDLE',
      pool_count: 1,
      fare_amount: booking.fareAmount || 0
    };

    const { data, error } = await supabase.from('bookings').insert([payload]).select().single();
    if (error) throw new Error(stringifyError(error));
    return data;
  },

  async acceptRide(id: string, driverPhone: string, driverId?: string, driverName?: string, vehicleNumber?: string, vehicleModel?: string) {
    const updatePayload: any = {
      status: 'DRIVER_ACCEPTED',
      driver_phone: driverPhone,
      accepted_at: new Date().toISOString()
    };

    if (driverId) updatePayload.driver_id = driverId;
    if (driverName) updatePayload.driver_name = driverName;
    if (vehicleNumber) updatePayload.driver_vehicle_number = vehicleNumber;
    if (vehicleModel) updatePayload.driver_vehicle_model = vehicleModel;

    const { data, error } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', id)
      // Concurrency check: start from pending/REQUESTED only
      .in('status', ['pending', 'REQUESTED'])
      .select()
      .maybeSingle();

    if (error) throw new Error(stringifyError(error));
    if (!data) throw new Error("RIDE_ALREADY_TAKEN");
    return data;
  },

  async markDriverEnRoute(id: string) {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'DRIVER_EN_ROUTE',
        en_route_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'DRIVER_ACCEPTED')
      .select()
      .single();
    if (error) throw new Error(stringifyError(error));
    return data;
  },

  async markDriverArrived(id: string) {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'DRIVER_ARRIVED',
        arrived_at: new Date().toISOString()
      })
      .eq('id', id)
      .in('status', ['DRIVER_ACCEPTED', 'DRIVER_EN_ROUTE'])
      .select()
      .single();
    if (error) throw new Error(stringifyError(error));
    return data;
  },

  async cancelBooking(id: string, _reason?: string) {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'CANCELLED',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', id)
      .in('status', ['pending', 'REQUESTED', 'DRIVER_ACCEPTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED'])
      .select()
      .single();
    if (error) throw new Error(stringifyError(error));
    return data;
  },

  async startRide(id: string) {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'IN_PROGRESS',
        started_at: new Date().toISOString()
      })
      .eq('id', id)
      .in('status', ['DRIVER_ACCEPTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED'])
      .select()
      .single();
    if (error) throw new Error(stringifyError(error));
    return data;
  },
  async completeRide(id: string, finalFare: number, distanceKm: number) {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        final_fare: finalFare,
        final_distance_km: distanceKm
      })
      .eq('id', id)
      .eq('status', 'IN_PROGRESS')
      .select()
      .single();
    if (error) throw new Error(stringifyError(error));
    return data;
  },

  async getRiderHistory(userId: string, limit = 20) {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, from, to, final_fare, final_distance_km, completed_at, created_at')
      .eq('user_id', userId)
      .eq('status', 'COMPLETED')
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(stringifyError(error));

    // Map the data to match expected interface
    return (data || []).map((ride: any) => ({
      id: ride.id,
      pickup_address: ride.from,
      dropoff_address: ride.to,
      final_fare: ride.final_fare,
      final_distance_km: ride.final_distance_km,
      completed_at: ride.completed_at
    }));
  },

  async getDriverHistory(driverId: string, limit = 20) {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, from, to, final_fare, final_distance_km, completed_at, created_at')
      .eq('driver_id', driverId)
      .eq('status', 'COMPLETED')
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(stringifyError(error));

    // Map the data to match expected interface
    return (data || []).map((ride: any) => ({
      id: ride.id,
      pickup_address: ride.from,
      dropoff_address: ride.to,
      final_fare: ride.final_fare,
      final_distance_km: ride.final_distance_km,
      completed_at: ride.completed_at
    }));
  },

  async sendOTP(phone: string) {
    const { error } = await supabase.auth.signInWithOtp({ phone: `+91${phone}` });
    if (error) throw new Error(stringifyError(error));
  },

  async verifyOTP(phone: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: `+91${phone}`,
      token,
      type: 'sms'
    });
    if (error) throw new Error(stringifyError(error));
    return data.session;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(stringifyError(error));
  },

  // --- PAYMENT VERIFICATION ---
  async initiatePaymentVerification(bookingId: string, amount: number) {
    const { error } = await supabase.from('payment_verifications').insert([{
      booking_id: bookingId,
      amount: amount,
      status: 'PENDING'
    }]);
    if (error) throw new Error(stringifyError(error));
  },

  async confirmPayment(bookingId: string, role: 'USER' | 'DRIVER', txRef?: string) {
    const update: any = role === 'USER'
      ? { passenger_confirmed: true, passenger_confirmation_time: new Date().toISOString(), transaction_reference: txRef }
      : { driver_confirmed: true, driver_confirmation_time: new Date().toISOString() };

    const { data, error } = await supabase
      .from('payment_verifications')
      .update(update)
      .eq('booking_id', bookingId)
      .select()
      .single();

    if (error) throw new Error(stringifyError(error));

    if (data.passenger_confirmed && data.driver_confirmed) {
      await this.finalizePayment(bookingId);
      return 'VERIFIED';
    }
    return 'WAITING_OTHER';
  },

  async finalizePayment(bookingId: string) {
    const { data: booking } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
    if (!booking) return;

    const commission = booking.fare_amount * 0.10;

    // Record commission as liability
    await supabase.from('wallet_transactions').insert({
      agent_phone: booking.driver_phone,
      type: 'COMMISSION',
      amount: -commission,
      description: `Commission for Trip ${bookingId}`,
      status: 'PENDING'
    });

    // Update booking status
    await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId);
    await supabase.from('payment_verifications').update({ status: 'COMPLETED' }).eq('booking_id', bookingId);
  },

  // --- RATINGS ---
  async submitRating(rating: RatingData) {
    const { error } = await supabase.from('ratings').insert([{
      booking_id: rating.bookingId,
      rated_by: rating.ratedBy,
      rated_user_id: rating.ratedUserId,
      stars: rating.stars,
      tags: rating.tags,
      comment: rating.comment
    }]);
    if (error) throw new Error(stringifyError(error));
  },

  // --- WALLET METHODS ---
  async getWalletDetails(phone: string) {
    const { data, error } = await supabase
      .from('agent_wallets')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(stringifyError(error));
    // Default structure if not found
    return data || {
      balance: 0,
      total_earned: 0,
      commission_due: 0,
      commission_paid: 0,
      is_online: false,
      last_online_at: null
    };
  },

  async toggleDriverStatus(phone: string, isOnline: boolean) {
    // We use upsert to ensure the row exists if this is the first time
    const updatePayload: any = {
      phone,
      is_online: isOnline,
      updated_at: new Date().toISOString()
    };

    if (isOnline) {
      updatePayload.last_online_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('agent_wallets')
      .upsert(updatePayload, { onConflict: 'phone' })
      .select()
      .single();

    if (error) throw new Error(stringifyError(error));
    return data;
  },

  async getTransactions(phone: string) {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('agent_phone', phone)
      .order('created_at', { ascending: false });

    if (error) throw new Error(stringifyError(error));
    return data || [];
  },

  async getBookingStatus(id: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select('status, driver_id, driver_phone, driver_name, driver_vehicle_number, driver_vehicle_model, from_lat, from_lng, to_lat, to_lng, fare_amount, distance_km, car_category, from_name, to_name, accepted_at')
      .eq('id', id)
      .single();
    if (error) throw new Error(stringifyError(error));
    return data;
  },

  async requestWithdrawal(phone: string, amount: number, upiId: string) {
    // 1. Log transaction
    const { error: txError } = await supabase.from('wallet_transactions').insert([{
      agent_phone: phone,
      type: 'WITHDRAWAL',
      amount: -amount,
      description: `Withdrawal to ${upiId}`,
      status: 'PENDING'
    }]);

    if (txError) throw new Error(stringifyError(txError));

    // 2. Update balance via RPC
    const { error: balError } = await supabase.rpc('process_agent_withdrawal', {
      target_phone: phone,
      requested_amount: amount
    });

    if (balError) throw new Error(stringifyError(balError));
  }
};
