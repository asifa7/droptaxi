import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getWalletDetails = query({
    args: { phone: v.string() },
    handler: async (ctx, args) => {
        const wallet = await ctx.db.query("agent_wallets").withIndex("by_phone", q => q.eq("phone", args.phone)).first();
        if (!wallet) {
            return {
                balance: 0,
                total_earned: 0,
                commission_due: 0,
                commission_paid: 0,
                is_online: false,
                last_online_at: null
            };
        }
        return wallet;
    },
});

export const toggleDriverStatus = mutation({
    args: { phone: v.string(), is_online: v.boolean() },
    handler: async (ctx, args) => {
        const wallet = await ctx.db.query("agent_wallets").withIndex("by_phone", q => q.eq("phone", args.phone)).first();
        const updatePayload: any = {
            is_online: args.is_online,
            updated_at: new Date().toISOString()
        };
        if (args.is_online) {
            updatePayload.last_online_at = new Date().toISOString();
        }

        if (wallet) {
            await ctx.db.patch(wallet._id, updatePayload);
            return await ctx.db.get(wallet._id);
        } else {
            // Create wallet if it doesn't exist
            const id = await ctx.db.insert("agent_wallets", {
                phone: args.phone,
                balance: 0,
                total_earned: 0,
                commission_due: 0,
                commission_paid: 0,
                is_online: args.is_online,
                last_online_at: args.is_online ? updatePayload.last_online_at : undefined,
                updated_at: updatePayload.updated_at,
            });
            return await ctx.db.get(id);
        }
    },
});

export const getTransactions = query({
    args: { phone: v.string() },
    handler: async (ctx, args) => {
        const txs = await ctx.db.query("wallet_transactions").withIndex("by_agent", q => q.eq("agent_phone", args.phone)).order("desc").collect();
        return txs;
    },
});

export const requestWithdrawal = mutation({
    args: { phone: v.string(), amount: v.number(), upi_id: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.insert("wallet_transactions", {
            agent_phone: args.phone,
            type: "WITHDRAWAL",
            amount: -args.amount,
            description: `Withdrawal to ${args.upi_id}`,
            status: "PENDING",
        });

        const wallet = await ctx.db.query("agent_wallets").withIndex("by_phone", q => q.eq("phone", args.phone)).first();
        if (wallet) {
            await ctx.db.patch(wallet._id, {
                balance: wallet.balance - args.amount,
            });
        }
    },
});
