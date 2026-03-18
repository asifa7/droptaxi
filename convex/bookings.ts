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

export const getActiveBooking = query({
    args: { userId: v.optional(v.string()), phone: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.userId && !args.phone) return null;

        // Search for active bookings for this user
        const activeStatues = ["pending", "REQUESTED", "DRIVER_ACCEPTED", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED", "IN_PROGRESS"];

        // We can't easily query multiple statuses with Index equality in one go without UNION or filtering
        // Let's filter for now or query the by_user index and filter manually
        let bookings = [];
        if (args.userId) {
            bookings = await ctx.db.query("bookings").withIndex("by_user", q => q.eq("user_id", args.userId)).order("desc").collect();
        } else {
            // Fallback to phone if no userId (anonymous users)
            bookings = await ctx.db.query("bookings").filter(q => q.eq(q.field("phone"), args.phone)).order("desc").collect();
        }

        return bookings.find(b => activeStatues.includes(b.status)) || null;
    }
});

export const getDriverFeed = query({
    args: { driverPhone: v.optional(v.string()) },
    handler: async (ctx, args) => {
        // Query ALL bookings to search for our "locked" active ride or show pending
        const allRides = await ctx.db.query("bookings").collect();
        const activeStats = ["DRIVER_ACCEPTED", "ACCEPTED", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED", "IN_PROGRESS", "STARTED"];

        const driverPhone = args.driverPhone;
        let myActiveRide = null;
        if (driverPhone) {
            myActiveRide = allRides.find(r =>
                r.driver_phone === driverPhone &&
                activeStats.includes((r.status || "").toUpperCase())
            );
        }

        // Check if driver is online
        if (driverPhone) {
            const wallet = await ctx.db.query("agent_wallets")
                .withIndex("by_phone", q => q.eq("phone", driverPhone))
                .first();

            if (!wallet?.is_online) {
                // If offline, only show the ride they are CURRENTLY on (if any)
                return myActiveRide ? [{ ...myActiveRide, id: myActiveRide._id }] : [];
            }
        }

        // 3. If locked into an active trip, don't show any other requests.
        if (myActiveRide) {
            return [{ ...myActiveRide, id: myActiveRide._id }];
        }

        const filtered = allRides.filter(r => {
            const s = (r.status || "pending").toUpperCase();

            // 1. Hide terminal states
            if (["COMPLETED", "CANCELLED"].includes(s)) return false;

            // 2. Hide if already assigned to someone else
            if (r.driver_phone && args.driverPhone && r.driver_phone !== args.driverPhone) return false;

            // 3. For the "Public Highway", ONLY show PENDING or REQUESTED
            if (s !== 'PENDING' && s !== 'REQUESTED') return false;

            return true;
        });

        const unique = Array.from(new Map(filtered.map(r => [String(r._id), r])).values());

        return unique.sort((a, b) => b._creationTime - a._creationTime)
            .map(r => ({ ...r, id: r._id }));
    }
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

export const getDriverActiveRides = query({
    args: { driverPhone: v.string() },
    handler: async (ctx, args) => {
        const activeStatuses = ["DRIVER_ACCEPTED", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED", "IN_PROGRESS", "started", "accepted"];
        return await ctx.db.query("bookings")
            .withIndex("by_driver_phone", q => q.eq("driver_phone", args.driverPhone))
            .collect()
            .then(res => res.filter(b => activeStatuses.includes(b.status)));
    }
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
            pool_status: ride.pool_status,
            pool_count: ride.pool_count,
            phone: ride.phone
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
        if (!booking) throw new Error("BOOKING_NOT_FOUND");

        // GUARD: Only pending or requested rides can be accepted
        if (booking.status !== "pending" && booking.status !== "REQUESTED") {
            throw new Error("RIDE_ALREADY_TAKEN");
        }

        // GUARD: Must be ONLINE to accept rides
        const wallet = await ctx.db.query("agent_wallets")
            .withIndex("by_phone", q => q.eq("phone", args.driver_phone))
            .first();

        if (!wallet?.is_online) {
            throw new Error("DRIVER_OFFLINE");
        }

        // GUARD: One active trip at a time
        const activeStatuses = ["DRIVER_ACCEPTED", "ACCEPTED", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED", "IN_PROGRESS", "STARTED"];

        // Search by phone if ID is missing, or by ID if available
        let activeTrip;
        if (args.driver_id) {
            activeTrip = await ctx.db.query("bookings")
                .withIndex("by_driver", q => q.eq("driver_id", args.driver_id))
                .collect()
                .then(rides => rides.find(r => activeStatuses.includes(r.status)));
        } else {
            activeTrip = await ctx.db.query("bookings")
                .withIndex("by_driver_phone", q => q.eq("driver_phone", args.driver_phone))
                .collect()
                .then(rides => rides.find(r => activeStatuses.includes(r.status)));
        }

        if (activeTrip) {
            throw new Error("DRIVER_ALREADY_BUSY");
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
        const booking = await ctx.db.get(args.id);
        if (!booking) throw new Error("BOOKING_NOT_FOUND");

        const currentStatus = booking.status;
        const nextStatus = args.status;

        // Transition Validation Logic: Allow jumping ahead but not going backward
        const activeStatuses = ["DRIVER_ACCEPTED", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED"];

        if (nextStatus === "DRIVER_EN_ROUTE") {
            if (currentStatus !== "DRIVER_ACCEPTED") throw new Error("INVALID_TRANSITION_EXPECTED_ACCEPTED");
        } else if (nextStatus === "DRIVER_ARRIVED") {
            if (!["DRIVER_ACCEPTED", "DRIVER_EN_ROUTE"].includes(currentStatus)) throw new Error("INVALID_TRANSITION_EXPECTED_PRE_ARRIVE_STATUS");
        } else if (nextStatus === "IN_PROGRESS") {
            if (!activeStatuses.includes(currentStatus)) throw new Error("INVALID_TRANSITION_EXPECTED_ACTIVE_STATUS");
        } else if (nextStatus === "CANCELLED") {
            if (["COMPLETED", "IN_PROGRESS"].includes(currentStatus)) throw new Error("CANNOT_CANCEL_ACTIVE_OR_COMPLETED_TRIP");
        }

        const updates: any = { status: nextStatus };
        const now = new Date().toISOString();

        if (nextStatus === "DRIVER_EN_ROUTE") updates.en_route_at = now;
        if (nextStatus === "DRIVER_ARRIVED") updates.arrived_at = now;
        if (nextStatus === "IN_PROGRESS") updates.started_at = now;
        if (nextStatus === "CANCELLED") updates.cancelled_at = now;

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
        const booking = await ctx.db.get(args.id);
        if (!booking) throw new Error("BOOKING_NOT_FOUND");

        // GUARD: Only IN_PROGRESS rides can be completed
        if (booking.status !== "IN_PROGRESS" && booking.status !== "started") {
            throw new Error("RIDE_NOT_IN_PROGRESS");
        }

        await ctx.db.patch(args.id, {
            status: "COMPLETED",
            completed_at: new Date().toISOString(),
            final_fare: args.final_fare,
            final_distance_km: args.final_distance_km,
        });

        // Track Commission Due (Driver now collects 100% and owes us % commission)
        const driverPhone = booking.driver_phone;
        if (driverPhone) {
            const dp: string = driverPhone;
            const wallet = await ctx.db.query("agent_wallets")
                .withIndex("by_phone", q => q.eq("phone", dp))
                .first();

            // 20% Commission Rate (consistent with totals = 0.8 * fare)
            const commissionAmount = Math.round(args.final_fare * 0.20);

            if (wallet) {
                await ctx.db.patch(wallet._id, {
                    commission_due: (wallet.commission_due || 0) + commissionAmount,
                    total_earned: (wallet.total_earned || 0) + args.final_fare,
                    updated_at: new Date().toISOString()
                });

                // Record commission transaction
                await ctx.db.insert("wallet_transactions", {
                    agent_phone: driverPhone,
                    type: "COMMISSION",
                    amount: commissionAmount,
                    description: `Commission for Ride ${String(args.id).slice(0, 8)}`,
                    status: "PENDING",
                });
            }
        }

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
