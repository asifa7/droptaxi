
// NEW FILE: services/subscriptionManager.ts
// Fix: Import missing types and supabase client
import { LatLng, PoolType } from './types';
import { supabase } from './supabaseClient';

interface OfficeSubscription {
  userId: string;
  companyId: string;
  homeLocation: LatLng;
  officeLocation: LatLng;
  virtualStopId: string; // Assigned pickup point
  schedule: {
    morningPickup: string; // "08:30"
    eveningPickup: string; // "18:00"
    activeDays: number[]; // [1,2,3,4,5] = Mon-Fri
  };
  tier: 'WEEKLY' | 'MONTHLY';
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED';
  tripsRemaining: number;
  autoRenew: boolean;
}

class SubscriptionManager {
  // Added: Private method for scheduled bookings
  private async createScheduledBooking(data: {
    userId: string;
    from: LatLng;
    to: LatLng;
    pickupTime: string;
    date: string;
    poolType: PoolType;
    subscriptionId: string;
  }) {
    return await supabase.from('bookings').insert([{
      phone: data.userId,
      from_lat: data.from.lat,
      from_lng: data.from.lng,
      to_lat: data.to.lat,
      to_lng: data.to.lng,
      trip_time: data.pickupTime,
      trip_date: data.date,
      pool_type: data.poolType,
      status: 'pending'
    }]);
  }

  // Added: Helper method to generate a readable stop name
  private async generateStopName(location: LatLng): Promise<string> {
    return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  }

  /**
   * Auto-create bookings for the next day
   * Runs via cron job at 8 PM daily
   */
  async scheduleTomorrowsTrips() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfWeek = tomorrow.getDay();

    // Fix: Destructure data from supabase response and fix iterate logic
    const { data: activeSubscriptions } = await supabase
      .from('office_subscriptions')
      .select('*')
      .eq('status', 'ACTIVE');

    if (!activeSubscriptions) return;

    for (const sub of activeSubscriptions) {
      // Manual check for activeDays if not filtered in query
      if (!sub.schedule?.activeDays?.includes(dayOfWeek)) continue;

      // Morning trip
      await this.createScheduledBooking({
        userId: sub.user_id,
        from: sub.home_location,
        to: sub.office_location,
        pickupTime: sub.schedule.morningPickup,
        date: tomorrow.toISOString().split('T')[0],
        poolType: PoolType.OFFICE_POOL,
        subscriptionId: sub.id
      });

      // Evening trip
      await this.createScheduledBooking({
        userId: sub.user_id,
        from: sub.office_location,
        to: sub.home_location,
        pickupTime: sub.schedule.eveningPickup,
        date: tomorrow.toISOString().split('T')[0],
        poolType: PoolType.OFFICE_POOL,
        subscriptionId: sub.id
      });

      // Decrement trips remaining
      await supabase
        .from('office_subscriptions')
        .update({ trips_remaining: sub.trips_remaining - 2 })
        .eq('id', sub.id);
    }
  }

  /**
   * Virtual Stop Assignment
   * Groups users by proximity and assigns optimal pickup points
   */
  async assignVirtualStop(homeLocation: LatLng, officeLocation: LatLng): Promise<string> {
    // Fix: Destructure data from supabase RPC response
    const { data: nearbyStops } = await supabase.rpc('find_nearby_virtual_stops', {
      lat: homeLocation.lat,
      lng: homeLocation.lng,
      radius_meters: 500
    });

    if (nearbyStops && nearbyStops.length > 0) {
      // Assign to existing stop with least members
      return nearbyStops.sort((a: any, b: any) => a.member_count - b.member_count)[0].id;
    }

    // Create new virtual stop
    const { data } = await supabase
      .from('virtual_stops')
      .insert({
        location: homeLocation,
        name: `Stop ${await this.generateStopName(homeLocation)}`,
        max_capacity: 15
      })
      .select()
      .single();

    return data ? data.id : '';
  }
}
