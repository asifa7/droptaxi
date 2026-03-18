import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Queries

export const getPendingRides = query({
    args: {},
    handler: async (ctx) => {
        // Return both 'pending' and 'REQUESTED' statuses
        const pending = await ctx.db.query("bookings").withIndex("by_status", q => q.eq("status", "pending")).collect();
        const requested = await ctx.db.query("bookings").withIndex("by_status", q => q.eq("status", "REQUESTED")).collect();

        // Combine and sort by creation time (descending)
        return [...pending, ...requested].sort((a, b) => b._creationTime - a._creationTime);
    },
});

export const getRiderHistory = query({
    args: { userId: v.string(), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const rides = await ctx.db.query("bookings")
            .withIndex("by_user", q => q.eq("user_id", args.userId).eq("status", "COMPLETED"))
            .order("desc")
            .take(args.limit ?? 20);
        return rides.map(ride => ({
            id: ride._id,
            pickup_address: ride.pickup_address,
            dropoff_address: ride.dropoff_address,
            final_fare: ride.final_fare,
            final_distance_km: ride.final_distance_km,
            completed_at: ride.completed_at
        }));
    },
});

export const getDriverHistory = query({
    args: { driverId: v.string(), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const rides = await ctx.db.query("bookings")
            .withIndex("by_driver", q => q.eq("driver_id", args.driverId).eq("status", "COMPLETED"))
            .order("desc")
            .take(args.limit ?? 20);
        return rides.map(ride => ({
            id: ride._id,
            pickup_address: ride.pickup_address,
            dropoff_address: ride.dropoff_address,
            final_fare: ride.final_fare,
            final_distance_km: ride.final_distance_km,
            completed_at: ride.completed_at
        }));
    },
});

export const getBookingStatus = query({
    args: { id: v.id("bookings") },
    handler: async (ctx, args) => {
        const ride = await ctx.db.get(args.id);
        if (!ride) throw new Error("Booking not found");
        return {
            id: ride._id,
            status: ride.status,
            driver_id: ride.driver_id,
            driver_phone: ride.driver_phone,
            driver_name: ride.driver_name,
            driver_vehicle_number: ride.driver_vehicle_number,
            driver_vehicle_model: ride.driver_vehicle_model,
            from_lat: ride.from_lat,
            from_lng: ride.from_lng,
            to_lat: ride.to_lat,
            to_lng: ride.to_lng,
            fare_amount: ride.fare_amount,
            distance_km: ride.distance_km,
            car_category: ride.car_category,
            from_name: ride.from_name,
            to_name: ride.to_name,
            accepted_at: ride.accepted_at,
        };
    },
});

export const findMatchingPool = query({
    args: { poolType: v.string() },
    handler: async (ctx, args) => {
        const poolRides = await ctx.db.query("bookings")
            .withIndex("by_pool", q => q.eq("pool_type", args.poolType).eq("pool_status", "WAITING"))
            .order("desc")
            .collect();

        // Filter out full pools (limit to 3 for example)
        const matching = poolRides.find(ride => (ride.pool_count || 0) < 3);
        return matching || null;
    },
});

// Mutations

export const createRideRequest = mutation({
    args: {
        from_name: v.optional(v.string()),
        to_name: v.optional(v.string()),
        from_lat: v.optional(v.number()),
        from_lng: v.optional(v.number()),
        to_lat: v.optional(v.number()),
        to_lng: v.optional(v.number()),
        distance_km: v.optional(v.number()),
        trip_type: v.optional(v.string()),
        fare_amount: v.optional(v.number()),
        market_min_fare: v.optional(v.number()),
        market_max_fare: v.optional(v.number()),
        car_category: v.optional(v.string()),
        phone: v.optional(v.string()),
        trip_date: v.optional(v.string()),
        trip_time: v.optional(v.string()),
        pool_type: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const isPool = args.pool_type && args.pool_type !== 'SOLO';

        const payload = {
            from_name: args.from_name,
            to_name: args.to_name,
            from_lat: args.from_lat,
            from_lng: args.from_lng,
            to_lat: args.to_lat,
            to_lng: args.to_lng,
            pickup_address: args.from_name,
            pickup_lat: args.from_lat,
            pickup_lng: args.from_lng,
            dropoff_address: args.to_name,
            dropoff_lat: args.to_lat,
            dropoff_lng: args.to_lng,
            distance_km: args.distance_km,
            ride_type: args.trip_type,
            estimated_fare: args.fare_amount,
            market_min_fare: args.market_min_fare,
            market_max_fare: args.market_max_fare,
            status: 'pending',
            car_category: args.car_category || 'SEDAN',
            trip_type: args.trip_type || 'ONE_WAY',
            phone: args.phone,
            trip_date: args.trip_date,
            trip_time: args.trip_time,
            pool_type: args.pool_type,
            pool_status: isPool ? 'WAITING' : 'IDLE',
            pool_count: 1,
            fare_amount: args.fare_amount
        };

        return await ctx.db.insert("bookings", payload);
    },
});

export const acceptRide = mutation({
    args: {
        id: v.id("bookings"),
        driver_phone: v.string(),
        driver_id: v.optional(v.string()),
        driver_name: v.optional(v.string()),
        vehicle_number: v.optional(v.string()),
        vehicle_model: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const booking = await ctx.db.get(args.id);
        if (!booking) throw new Error("Booking not found");
        if (booking.status !== "pending" && booking.status !== "REQUESTED") {
            throw new Error("RIDE_ALREADY_TAKEN");
        }

        await ctx.db.patch(args.id, {
            status: "DRIVER_ACCEPTED",
            driver_phone: args.driver_phone,
            driver_id: args.driver_id,
            driver_name: args.driver_name,
            driver_vehicle_number: args.vehicle_number,
            driver_vehicle_model: args.vehicle_model,
            accepted_at: new Date().toISOString(),
        });

        return await ctx.db.get(args.id);
    },
});

export const updateStatus = mutation({
    args: {
        id: v.id("bookings"),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        const updates: any = { status: args.status };
        const now = new Date().toISOString();

        if (args.status === "DRIVER_EN_ROUTE") updates.en_route_at = now;
        if (args.status === "DRIVER_ARRIVED") updates.arrived_at = now;
        if (args.status === "IN_PROGRESS") updates.started_at = now;
        if (args.status === "CANCELLED") updates.cancelled_at = now;

        await ctx.db.patch(args.id, updates);
        return await ctx.db.get(args.id);
    },
});

export const completeRide = mutation({
    args: {
        id: v.id("bookings"),
        final_fare: v.number(),
        final_distance_km: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            status: "COMPLETED",
            completed_at: new Date().toISOString(),
            final_fare: args.final_fare,
            final_distance_km: args.final_distance_km,
        });
        return await ctx.db.get(args.id);
    },
});

export const joinPool = mutation({
    args: { id: v.id("bookings") },
    handler: async (ctx, args) => {
        // Basic increment or set logic here:
        await ctx.db.patch(args.id, {
            pool_count: 2,
            updated_at: new Date().toISOString(),
        });
        return await ctx.db.get(args.id);
    },
});

export const deleteBooking = mutation({
    args: { id: v.id("bookings") },
    handler: async (ctx, args) => {
        const booking = await ctx.db.get(args.id);
        if (booking) {
            await ctx.db.delete(args.id);
        }
        return true;
    },
});
