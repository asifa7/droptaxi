import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const initiatePaymentVerification = mutation({
    args: { bookingId: v.string(), amount: v.number() },
    handler: async (ctx, args) => {
        await ctx.db.insert("payment_verifications", {
            booking_id: args.bookingId,
            amount: args.amount,
            status: "PENDING",
            passenger_confirmed: false,
            driver_confirmed: false,
        });
    },
});

export const confirmPayment = mutation({
    args: { bookingId: v.string(), role: v.string(), txRef: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const pmt = await ctx.db.query("payment_verifications").withIndex("by_booking", q => q.eq("booking_id", args.bookingId)).first();
        if (!pmt) throw new Error("Payment missing");

        const update: any = {};
        if (args.role === "USER") {
            update.passenger_confirmed = true;
            update.passenger_confirmation_time = new Date().toISOString();
            if (args.txRef) update.transaction_reference = args.txRef;
        } else {
            update.driver_confirmed = true;
            update.driver_confirmation_time = new Date().toISOString();
        }

        await ctx.db.patch(pmt._id, update);
        const updated = await ctx.db.get(pmt._id);

        if (updated?.passenger_confirmed && updated?.driver_confirmed) {
            // finalize
            await ctx.db.patch(pmt._id, { status: "COMPLETED" });

            const parts = updated.booking_id.split("|");
            // This part would normally patch the booking too
            // and do commission. We'll leave it as VERIFIED logic.
            return "VERIFIED";
        }
        return "WAITING_OTHER";
    },
});

export const submitRating = mutation({
    args: {
        bookingId: v.string(),
        ratedBy: v.string(),
        ratedUserId: v.string(),
        stars: v.number(),
        tags: v.optional(v.array(v.string())),
        comment: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("ratings", {
            booking_id: args.bookingId,
            rated_by: args.ratedBy,
            rated_user_id: args.ratedUserId,
            stars: args.stars,
            tags: args.tags,
            comment: args.comment,
        });
    },
});
