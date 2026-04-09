import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole } from "./helpers";

export const addAvailabilitySlot = mutation({
  args: {
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "doctor");

    return await ctx.db.insert("availabilitySlots", {
      doctorId: user._id,
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
    const userId = await requireAuth(ctx);

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
    const user = await requireRole(ctx, "doctor");

    return await ctx.db
      .query("availabilitySlots")
      .withIndex("by_doctorId", (q) => q.eq("doctorId", user._id))
      .take(100);
  },
});

export const getDoctorAvailability = query({
  args: { doctorId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    return await ctx.db
      .query("availabilitySlots")
      .withIndex("by_doctorId", (q) => q.eq("doctorId", args.doctorId))
      .take(100);
  },
});
