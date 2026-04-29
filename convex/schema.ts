import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(v.union(v.literal("doctor"), v.literal("patient"))),
    address: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_role", ["role"]),

  doctorProfiles: defineTable({
    userId: v.id("users"),
    fullName: v.string(),
    specialization: v.string(),
    bio: v.optional(v.string()),
    profileImage: v.optional(v.id("_storage")),
  })
    .index("by_userId", ["userId"])
    .index("by_specialization", ["specialization"]),

  availabilitySlots: defineTable({
    doctorId: v.id("users"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    isBooked: v.boolean(),
  })
    .index("by_doctorId", ["doctorId"])
    .index("by_doctorId_and_date", ["doctorId", "date"]),

  appointments: defineTable({
    patientId: v.id("users"),
    doctorId: v.id("users"),
    slotId: v.id("availabilitySlots"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("rejected"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    intakeId: v.optional(v.id("healthIntake")),
  })
    .index("by_patientId", ["patientId"])
    .index("by_doctorId", ["doctorId"])
    .index("by_slotId", ["slotId"]),

  // --- Phase 2 tables ---

  healthIntake: defineTable({
    patientId: v.id("users"),
    appointmentId: v.optional(v.id("appointments")),
    chiefComplaint: v.string(),
    symptomDuration: v.string(),
    painLevel: v.number(),
    medications: v.string(),
    allergies: v.string(),
    conditions: v.array(v.string()),
    documents: v.array(v.id("_storage")),
    ocrText: v.optional(v.string()),
    aiAnalysis: v.optional(
      v.object({
        suggestedSpecialty: v.string(),
        urgencyLevel: v.string(),
        summary: v.string(),
        possibleConditions: v.array(v.string()),
        recommendedTests: v.array(v.string()),
        flags: v.array(v.string()),
      }),
    ),
    extractedFields: v.optional(
      v.object({
        patientInfo: v.object({
          name: v.optional(v.string()),
          dateOfBirth: v.optional(v.string()),
          mrn: v.optional(v.string()),
        }),
        labResults: v.array(
          v.object({
            name: v.string(),
            value: v.string(),
            unit: v.optional(v.string()),
            referenceRange: v.optional(v.string()),
          }),
        ),
        medicationsMentioned: v.array(v.string()),
        diagnoses: v.array(v.string()),
        notes: v.string(),
      }),
    ),
  })
    .index("by_patientId", ["patientId"])
    .index("by_appointmentId", ["appointmentId"]),

  referrals: defineTable({
    appointmentId: v.id("appointments"),
    doctorId: v.id("users"),
    patientId: v.id("users"),
    type: v.union(
      v.literal("pharmacy"),
      v.literal("lab"),
      v.literal("imaging"),
      v.literal("specialist"),
    ),
    details: v.object({
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
    }),
    urgencyLevel: v.union(
      v.literal("routine"),
      v.literal("urgent"),
      v.literal("emergency"),
    ),
    notes: v.optional(v.string()),
    assignedLocationId: v.optional(v.id("partnerLocations")),
    status: v.union(
      v.literal("issued"),
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("rejected"),
      v.literal("expired"),
    ),
    issuedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_appointmentId", ["appointmentId"])
    .index("by_doctorId", ["doctorId"])
    .index("by_patientId", ["patientId"])
    .index("by_status", ["status"])
    .index("by_assignedLocationId", ["assignedLocationId"]),

  partnerLocations: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("pharmacy"),
      v.literal("lab"),
      v.literal("imaging_center"),
      v.literal("clinic"),
    ),
    address: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    acceptedTypes: v.array(v.string()),
    operatingHours: v.string(),
    contactInfo: v.object({
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
    isActive: v.boolean(),
  })
    .index("by_type", ["type"])
    .index("by_isActive", ["isActive"]),

  referralStatusHistory: defineTable({
    referralId: v.id("referrals"),
    fromStatus: v.string(),
    toStatus: v.string(),
    changedBy: v.id("users"),
    changedAt: v.number(),
    reason: v.optional(v.string()),
  }).index("by_referralId", ["referralId"]),
});
