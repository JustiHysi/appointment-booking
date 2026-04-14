import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole } from "./helpers";

export const createHealthIntake = mutation({
  args: {
    chiefComplaint: v.string(),
    symptomDuration: v.string(),
    painLevel: v.number(),
    medications: v.string(),
    allergies: v.string(),
    conditions: v.array(v.string()),
    documents: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "patient");

    if (args.painLevel < 1 || args.painLevel > 10) {
      throw new Error("Pain level must be between 1 and 10");
    }
    if (!args.chiefComplaint.trim()) {
      throw new Error("Chief complaint is required");
    }

    return await ctx.db.insert("healthIntake", {
      patientId: user._id,
      chiefComplaint: args.chiefComplaint.trim(),
      symptomDuration: args.symptomDuration,
      painLevel: args.painLevel,
      medications: args.medications.trim(),
      allergies: args.allergies.trim(),
      conditions: args.conditions,
      documents: args.documents,
    });
  },
});

export const getHealthIntake = query({
  args: { intakeId: v.id("healthIntake") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const intake = await ctx.db.get(args.intakeId);
    if (!intake) return null;
    if (intake.patientId !== userId) throw new Error("Not your intake");

    const documentUrls = await Promise.all(
      intake.documents.map((id) => ctx.storage.getUrl(id)),
    );

    return { ...intake, documentUrls };
  },
});

export const updateHealthIntake = mutation({
  args: {
    intakeId: v.id("healthIntake"),
    chiefComplaint: v.optional(v.string()),
    symptomDuration: v.optional(v.string()),
    painLevel: v.optional(v.number()),
    medications: v.optional(v.string()),
    allergies: v.optional(v.string()),
    conditions: v.optional(v.array(v.string())),
    documents: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "patient");

    const intake = await ctx.db.get(args.intakeId);
    if (!intake) throw new Error("Intake not found");
    if (intake.patientId !== user._id) throw new Error("Not your intake");
    if (intake.appointmentId) throw new Error("Cannot edit after booking");

    if (args.painLevel !== undefined && (args.painLevel < 1 || args.painLevel > 10)) {
      throw new Error("Pain level must be between 1 and 10");
    }

    const { intakeId: _, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined),
    );

    if (Object.keys(filtered).length > 0) {
      await ctx.db.patch(args.intakeId, filtered);
    }
  },
});
