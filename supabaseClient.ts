
import { createClient } from '@supabase/supabase-js';
import { BookingDetails } from './types';

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
  
  try {
    const stringified = JSON.stringify(err, null, 2);
    return stringified === '{}' ? String(err) : stringified;
  } catch {
    return String(err);
  }
};

export const supabaseService = {
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

  async getPendingRides() {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw new Error(stringifyError(error));
    return data || [];
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

  async createRideRequest(booking: BookingDetails) {
    const payload = {
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
      // Store stops as JSON string to prevent data loss
      stops_data: booking.stops.length > 0 ? JSON.stringify(booking.stops) : null,
      is_for_someone_else: booking.isForSomeoneElse,
      recipient_phone: booking.recipientPhone || null
    };

    const { data, error } = await supabase
      .from('bookings')
      .insert([payload])
      .select()
      .single();

    if (error) {
      // Fix: Log the error using JSON.stringify to avoid [object Object]
      console.error("Supabase Detailed Log:", JSON.stringify(error, null, 2));
      throw new Error(stringifyError(error));
    }
    return data;
  }
};
