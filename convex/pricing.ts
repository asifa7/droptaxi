import { query } from "./_generated/server";

export const fetchPricingRules = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("pricing_rules").collect();
    },
});
