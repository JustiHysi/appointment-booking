import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireRole } from "./helpers";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const updatePatientProfile = mutation({
  args: {
    address: v.string(),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "patient");

    if (!args.address.trim()) throw new Error("Address is required");
    if (args.latitude < -90 || args.latitude > 90) throw new Error("Invalid latitude");
    if (args.longitude < -180 || args.longitude > 180) throw new Error("Invalid longitude");

    await ctx.db.patch(user._id, {
      address: args.address.trim(),
      latitude: args.latitude,
      longitude: args.longitude,
    });
  },
});
