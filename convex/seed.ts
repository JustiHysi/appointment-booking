import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const run = internalMutation({
  args: {
    doctorUserId: v.id("users"),
    patientUserId: v.id("users"),
  },
  handler: async (ctx, { doctorUserId, patientUserId }) => {
    const existingProfile = await ctx.db
      .query("doctorProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", doctorUserId))
      .unique();

    if (!existingProfile) {
      await ctx.db.insert("doctorProfiles", {
        userId: doctorUserId,
        fullName: "Dr. Sarah Johnson",
        specialization: "Cardiology",
        bio: "Board-certified cardiologist with 15 years of experience.",
      });
    }

    const statuses = [
      "pending", "confirmed", "completed", "rejected", "cancelled",
    ] as const;

    const reasons = [
      "Routine checkup", "Chest pain evaluation", "Follow-up visit",
      "Blood pressure monitoring", "Heart palpitations", "Annual physical",
      "Shortness of breath", "Post-surgery follow-up", "ECG review",
      "Medication adjustment",
    ];

    let slotsCreated = 0;
    let appointmentsCreated = 0;

    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i - 15);
      const dateStr = date.toISOString().split("T")[0];
      const hour = 9 + (i % 8);
      const startTime = `${String(hour).padStart(2, "0")}:00`;
      const endTime = `${String(hour + 1).padStart(2, "0")}:00`;

      const isBooked = i < 25;

      const slotId = await ctx.db.insert("availabilitySlots", {
        doctorId: doctorUserId,
        date: dateStr,
        startTime,
        endTime,
        isBooked,
      });
      slotsCreated++;

      if (isBooked) {
        const status = statuses[i % statuses.length];
        await ctx.db.insert("appointments", {
          patientId: patientUserId,
          doctorId: doctorUserId,
          slotId,
          date: dateStr,
          startTime,
          endTime,
          status,
          reason: reasons[i % reasons.length],
          notes: status === "completed" ? "Patient doing well. Continue medication." : undefined,
        });
        appointmentsCreated++;
      }
    }

    return { slotsCreated, appointmentsCreated };
  },
});
