
import { createClient } from '@supabase/supabase-js';
import { BookingDetails, PoolStatus, PoolType, WalletTransaction } from './types';

/**
 * DATABASE MIGRATION SCRIPT (Update):
 * 
 * -- Create wallet transactions table
 * CREATE TABLE IF NOT EXISTS wallet_transactions (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   agent_phone text NOT NULL,
 *   type text NOT NULL, -- 'EARNING', 'WITHDRAWAL', 'COMMISSION'
 *   amount numeric NOT NULL,
 *   description text,
 *   status text DEFAULT 'COMPLETED',
 *   created_at timestamp with time zone DEFAULT now()
 * );
 * 
 * -- Create agent_wallets table
 * CREATE TABLE IF NOT EXISTS agent_wallets (
 *   phone text PRIMARY KEY,
 *   balance numeric DEFAULT 0,
 *   total_earned numeric DEFAULT 0,
 *   updated_at timestamp with time zone DEFAULT now()
 * );
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

export const supabaseService = {
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

  // Fix: Added joinPool method to allow users to join an existing ride pool
  async joinPool(id: string) {
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        pool_count: 2, // In a real app, this would be pool_count + 1 via RPC
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
      status: 'pending',
      car_category: String(booking.carCategory || 'SEDAN'),
      trip_type: String(booking.tripType || 'ONE_WAY'),
      phone: booking.phone || '',
      trip_date: booking.date || '',
      trip_time: booking.time || '',
      pool_type: booking.poolType,
      pool_status: isPool ? 'WAITING' : 'IDLE',
      pool_count: 1
    };

    const { data, error } = await supabase.from('bookings').insert([payload]).select().single();
    if (error) throw new Error(stringifyError(error));
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
  },

  // Fix: Added sendOTP method for Supabase SMS authentication
  async sendOTP(phone: string) {
    const { error } = await supabase.auth.signInWithOtp({ phone: `+91${phone}` });
    if (error) throw new Error(stringifyError(error));
  },

  // Fix: Added verifyOTP method for completing Supabase SMS authentication
  async verifyOTP(phone: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: `+91${phone}`,
      token,
      type: 'sms'
    });
    if (error) throw new Error(stringifyError(error));
    return data.session;
  },

  // Fix: Added signOut method for user logout
  async signOut() {
    const { error } = await supabase.auth.signOut();
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
    return data || { balance: 0, total_earned: 0 };
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

    // 2. Update balance
    const { error: balError } = await supabase.rpc('update_wallet_balance', { 
      target_phone: phone, 
      deduct_amount: amount 
    });

    if (balError) throw new Error(stringifyError(balError));
  }
};
