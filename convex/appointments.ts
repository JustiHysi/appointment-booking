import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const bookAppointment = mutation({
  args: {
    slotId: v.id("availabilitySlots"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "patient") {
      throw new Error("Only patients can book appointments");
    }

    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new Error("Slot not found");
    if (slot.isBooked) throw new Error("Slot is already booked");

    // Mark slot as booked
    await ctx.db.patch(slot._id, { isBooked: true });

    // Create appointment
    return await ctx.db.insert("appointments", {
      patientId: userId,
      doctorId: slot.doctorId,
      slotId: slot._id,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: "pending",
      reason: args.reason,
    });
  },
});

export const getMyAppointments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    if (user.role === "doctor") {
      return await ctx.db
        .query("appointments")
        .withIndex("by_doctorId", (q) => q.eq("doctorId", userId))
        .take(100);
    }

    return await ctx.db
      .query("appointments")
      .withIndex("by_patientId", (q) => q.eq("patientId", userId))
      .take(100);
  },
});

export const updateAppointmentStatus = mutation({
  args: {
    appointmentId: v.id("appointments"),
    status: v.union(
      v.literal("confirmed"),
      v.literal("rejected"),
      v.literal("cancelled"),
      v.literal("completed"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");

    // Doctor can confirm, reject, or complete
    if (user.role === "doctor") {
      if (appointment.doctorId !== userId) {
        throw new Error("Not your appointment");
      }
      if (!["confirmed", "rejected", "completed"].includes(args.status)) {
        throw new Error("Doctors can only confirm, reject, or complete appointments");
      }
    }

    // Patient can only cancel
    if (user.role === "patient") {
      if (appointment.patientId !== userId) {
        throw new Error("Not your appointment");
      }
      if (args.status !== "cancelled") {
        throw new Error("Patients can only cancel appointments");
      }
    }

    // If rejecting or cancelling, free up the slot
    if (args.status === "rejected" || args.status === "cancelled") {
      await ctx.db.patch(appointment.slotId, { isBooked: false });
    }

    await ctx.db.patch(args.appointmentId, { status: args.status });
  },
});

export const addDoctorNotes = mutation({
  args: {
    appointmentId: v.id("appointments"),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "doctor") {
      throw new Error("Only doctors can add notes");
    }

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");
    if (appointment.doctorId !== userId) {
      throw new Error("Not your appointment");
    }
    if (appointment.status !== "confirmed") {
      throw new Error("Can only add notes to confirmed appointments");
    }

    await ctx.db.patch(args.appointmentId, { notes: args.notes });
  },
});
