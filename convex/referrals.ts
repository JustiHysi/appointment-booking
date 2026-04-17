import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  mutation,
  query,
  internalMutation,
  MutationCtx,
} from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { requireAuth, requireRole } from "./helpers";

const EXPIRY_MS = 72 * 60 * 60 * 1000;

const REFERRAL_TYPE = v.union(
  v.literal("pharmacy"),
  v.literal("lab"),
  v.literal("imaging"),
  v.literal("specialist"),
);

const URGENCY = v.union(
  v.literal("routine"),
  v.literal("urgent"),
  v.literal("emergency"),
);

const DETAILS = v.object({
  items: v.optional(
    v.array(
      v.object({
        name: v.string(),
        dosage: v.optional(v.string()),
        duration: v.optional(v.string()),
      }),
    ),
  ),
  tests: v.optional(v.array(v.string())),
  imagingType: v.optional(v.string()),
  bodyRegion: v.optional(v.string()),
  referralSpecialty: v.optional(v.string()),
  referralReason: v.optional(v.string()),
});

// Map referral type to partner location type
function partnerTypeFor(referralType: Doc<"referrals">["type"]): Doc<"partnerLocations">["type"] {
  if (referralType === "imaging") return "imaging_center";
  if (referralType === "specialist") return "clinic";
  return referralType;
}

// Status state machine — what transitions are legal
function isValidTransition(from: Doc<"referrals">["status"], to: Doc<"referrals">["status"]): boolean {
  const allowed: Record<string, string[]> = {
    issued: ["pending", "rejected"],
    pending: ["accepted", "rejected"],
    accepted: ["in_progress", "rejected"],
    in_progress: ["completed", "rejected"],
  };
  return allowed[from]?.includes(to) ?? false;
}

// Centralized history logger
async function logHistory(
  ctx: MutationCtx,
  referralId: Id<"referrals">,
  fromStatus: string,
  toStatus: string,
  changedBy: Id<"users">,
  reason?: string,
) {
  await ctx.db.insert("referralStatusHistory", {
    referralId,
    fromStatus,
    toStatus,
    changedBy,
    changedAt: Date.now(),
    reason,
  });
}

export const createReferral = mutation({
  args: {
    appointmentId: v.id("appointments"),
    type: REFERRAL_TYPE,
    details: DETAILS,
    urgencyLevel: URGENCY,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doctor = await requireRole(ctx, "doctor");

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");
    if (appointment.doctorId !== doctor._id) throw new Error("Not your appointment");

    const patient = await ctx.db.get(appointment.patientId);
    if (!patient) throw new Error("Patient not found");
    if (patient.latitude === undefined || patient.longitude === undefined) {
      throw new Error("Patient hasn't set their address yet");
    }

    const now = Date.now();
    const referralId = await ctx.db.insert("referrals", {
      appointmentId: args.appointmentId,
      doctorId: doctor._id,
      patientId: appointment.patientId,
      type: args.type,
      details: args.details,
      urgencyLevel: args.urgencyLevel,
      notes: args.notes,
      status: "issued",
      issuedAt: now,
      expiresAt: now + EXPIRY_MS,
    });

    await logHistory(ctx, referralId, "", "issued", doctor._id);

    await ctx.scheduler.runAfter(EXPIRY_MS, internal.referrals.autoExpire, { referralId });

    return referralId;
  },
});

export const chooseLocation = mutation({
  args: {
    referralId: v.id("referrals"),
    locationId: v.id("partnerLocations"),
  },
  handler: async (ctx, args) => {
    const patient = await requireRole(ctx, "patient");

    const referral = await ctx.db.get(args.referralId);
    if (!referral) throw new Error("Referral not found");
    if (referral.patientId !== patient._id) throw new Error("Not your referral");
    if (referral.status !== "issued") throw new Error("Location can only be chosen while referral is issued");

    const location = await ctx.db.get(args.locationId);
    if (!location || !location.isActive) throw new Error("Invalid location");

    await ctx.db.patch(args.referralId, {
      assignedLocationId: args.locationId,
      status: "pending",
    });

    await logHistory(ctx, args.referralId, "issued", "pending", patient._id);
  },
});

export const updateStatus = mutation({
  args: {
    referralId: v.id("referrals"),
    newStatus: v.union(
      v.literal("accepted"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("rejected"),
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const referral = await ctx.db.get(args.referralId);
    if (!referral) throw new Error("Referral not found");
    if (referral.doctorId !== userId && referral.patientId !== userId) {
      throw new Error("Not your referral");
    }

    if (!isValidTransition(referral.status, args.newStatus)) {
      throw new Error(`Cannot transition from ${referral.status} to ${args.newStatus}`);
    }

    if (args.newStatus === "rejected" && !args.reason?.trim()) {
      throw new Error("Rejection reason is required");
    }

    await ctx.db.patch(args.referralId, { status: args.newStatus });
    await logHistory(ctx, args.referralId, referral.status, args.newStatus, userId, args.reason);
  },
});

export const getMyReferrals = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const index = user.role === "doctor" ? "by_doctorId" : "by_patientId";
    const field = user.role === "doctor" ? "doctorId" : "patientId";

    return await ctx.db
      .query("referrals")
      .withIndex(index, (q) => q.eq(field as "doctorId" | "patientId", userId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getReferral = query({
  args: { referralId: v.id("referrals") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const referral = await ctx.db.get(args.referralId);
    if (!referral) return null;
    if (referral.doctorId !== userId && referral.patientId !== userId) {
      throw new Error("Not your referral");
    }

    const location = referral.assignedLocationId
      ? await ctx.db.get(referral.assignedLocationId)
      : null;

    const history = await ctx.db
      .query("referralStatusHistory")
      .withIndex("by_referralId", (q) => q.eq("referralId", args.referralId))
      .collect();

    return { ...referral, location, history };
  },
});

export const getSuggestedLocations = query({
  args: { referralId: v.id("referrals") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const referral = await ctx.db.get(args.referralId);
    if (!referral) return [];
    if (referral.patientId !== userId && referral.doctorId !== userId) {
      throw new Error("Not your referral");
    }

    const patient = await ctx.db.get(referral.patientId);
    if (!patient?.latitude || !patient?.longitude) return [];

    const closest: Array<Doc<"partnerLocations"> & { distanceKm: number }> =
      await ctx.runQuery(api.partnerLocations.findClosest, {
        type: partnerTypeFor(referral.type),
        latitude: patient.latitude,
        longitude: patient.longitude,
        limit: 3,
      });

    return closest;
  },
});

// Partner-facing notification payload — what a partner system would receive.
// In production this would only be accessible by the partner; here we expose
// it to the patient owning the referral so the demo can show the partner side.
export const getPartnerView = query({
  args: { referralId: v.id("referrals") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const referral = await ctx.db.get(args.referralId);
    if (!referral) return null;
    if (referral.patientId !== userId && referral.doctorId !== userId) {
      throw new Error("Not your referral");
    }

    const patient = await ctx.db.get(referral.patientId);
    const doctor = await ctx.db.get(referral.doctorId);
    const doctorProfile = doctor
      ? await ctx.db
          .query("doctorProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", doctor._id))
          .unique()
      : null;

    return {
      referralId: referral._id,
      type: referral.type,
      details: referral.details,
      urgencyLevel: referral.urgencyLevel,
      doctorNotes: referral.notes ?? null,
      patient: {
        name: patient?.name ?? null,
        phone: patient?.phone ?? null,
        address: patient?.address ?? null,
      },
      doctor: {
        name: doctorProfile?.fullName ?? doctor?.name ?? null,
        specialization: doctorProfile?.specialization ?? null,
      },
      issuedAt: referral.issuedAt,
    };
  },
});

export const autoExpire = internalMutation({
  args: { referralId: v.id("referrals") },
  handler: async (ctx, args) => {
    const referral = await ctx.db.get(args.referralId);
    if (!referral) return;
    if (referral.status !== "issued" && referral.status !== "pending") return;

    await ctx.db.patch(args.referralId, { status: "expired" });
    await ctx.db.insert("referralStatusHistory", {
      referralId: args.referralId,
      fromStatus: referral.status,
      toStatus: "expired",
      changedBy: referral.doctorId,
      changedAt: Date.now(),
      reason: "Auto-expired after 72 hours without acceptance",
    });
  },
});
