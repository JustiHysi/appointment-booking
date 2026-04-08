import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const addAvailabilitySlot = mutation({
  args: {
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "doctor") {
      throw new Error("Only doctors can add availability slots");
    }

    return await ctx.db.insert("availabilitySlots", {
      doctorId: userId,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      isBooked: false,
    });
  },
});

export const removeAvailabilitySlot = mutation({
  args: { slotId: v.id("availabilitySlots") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new Error("Slot not found");
    if (slot.doctorId !== userId) throw new Error("Not your slot");
    if (slot.isBooked) throw new Error("Cannot remove a booked slot");

    await ctx.db.delete(args.slotId);
  },
});

export const getMyAvailability = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "doctor") {
      throw new Error("Only doctors can view their own availability");
    }

    return await ctx.db
      .query("availabilitySlots")
      .withIndex("by_doctorId", (q) => q.eq("doctorId", userId))
      .take(100);
  },
});

export const getDoctorAvailability = query({
  args: { doctorId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db
      .query("availabilitySlots")
      .withIndex("by_doctorId", (q) => q.eq("doctorId", args.doctorId))
      .take(100);
  },
});
