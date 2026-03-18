import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    bookings: defineTable({
        from_name: v.optional(v.string()),
        to_name: v.optional(v.string()),
        from_lat: v.optional(v.number()),
        from_lng: v.optional(v.number()),
        to_lat: v.optional(v.number()),
        to_lng: v.optional(v.number()),
        pickup_address: v.optional(v.string()),
        pickup_lat: v.optional(v.number()),
        pickup_lng: v.optional(v.number()),
        dropoff_address: v.optional(v.string()),
        dropoff_lat: v.optional(v.number()),
        dropoff_lng: v.optional(v.number()),
        distance_km: v.optional(v.number()),
        ride_type: v.optional(v.string()),
        estimated_fare: v.optional(v.number()),
        market_min_fare: v.optional(v.number()),
        market_max_fare: v.optional(v.number()),
        status: v.string(), // 'pending', 'REQUESTED', 'DRIVER_ACCEPTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
        car_category: v.optional(v.string()),
        trip_type: v.optional(v.string()),
        phone: v.optional(v.string()),
        trip_date: v.optional(v.string()),
        trip_time: v.optional(v.string()),
        pool_type: v.optional(v.string()), // 'SOLO', etc.
        pool_status: v.optional(v.string()),
        pool_count: v.optional(v.number()),
        fare_amount: v.optional(v.number()),
        user_id: v.optional(v.string()),

        driver_phone: v.optional(v.string()),
        driver_id: v.optional(v.string()),
        driver_name: v.optional(v.string()),
        driver_vehicle_number: v.optional(v.string()),
        driver_vehicle_model: v.optional(v.string()),

        accepted_at: v.optional(v.string()),
        en_route_at: v.optional(v.string()),
        arrived_at: v.optional(v.string()),
        started_at: v.optional(v.string()),
        completed_at: v.optional(v.string()),
        cancelled_at: v.optional(v.string()),

        final_fare: v.optional(v.number()),
        final_distance_km: v.optional(v.number()),
        updated_at: v.optional(v.string()),
    }).index("by_status", ["status"]).index("by_pool", ["pool_type", "pool_status", "pool_count"]).index("by_user", ["user_id", "status"]).index("by_driver", ["driver_id", "status"]),

    pricing_rules: defineTable({
        car_category: v.string(),
        base_fare: v.number(),
        min_fare: v.number(),
        rate_per_km_city: v.number(),
        rate_per_km_intercity: v.number(),
        rate_per_min: v.number(),
        night_multiplier: v.number(),
        surge_multiplier: v.number(),
        waiting_rate: v.number(),
        city_radius_km: v.number(),
    }).index("by_category", ["car_category"]),

    payment_verifications: defineTable({
        booking_id: v.string(),
        passenger_confirmed: v.boolean(),
        driver_confirmed: v.boolean(),
        passenger_confirmation_time: v.optional(v.string()),
        driver_confirmation_time: v.optional(v.string()),
        transaction_reference: v.optional(v.string()),
        amount: v.number(),
        status: v.string(), // 'PENDING', 'COMPLETED'
    }).index("by_booking", ["booking_id"]),

    ratings: defineTable({
        booking_id: v.string(),
        rated_by: v.string(),
        rated_user_id: v.string(),
        stars: v.number(),
        tags: v.optional(v.array(v.string())),
        comment: v.optional(v.string()),
    }).index("by_booking", ["booking_id"]),

    agent_wallets: defineTable({
        phone: v.string(),
        balance: v.number(),
        total_earned: v.number(),
        commission_due: v.number(),
        commission_paid: v.number(),
        is_online: v.boolean(),
        last_online_at: v.optional(v.string()),
        updated_at: v.optional(v.string()),
    }).index("by_phone", ["phone"]),

    wallet_transactions: defineTable({
        agent_phone: v.string(),
        type: v.string(), // 'COMMISSION', 'WITHDRAWAL'
        amount: v.number(),
        description: v.optional(v.string()),
        status: v.string(), // 'PENDING'
    }).index("by_agent", ["agent_phone"]),
});
