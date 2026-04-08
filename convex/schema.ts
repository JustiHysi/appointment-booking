import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // Override auth's users table to add custom "role" field
  users: defineTable({
    // Fields from authTables
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    // Custom field
    role: v.optional(v.union(v.literal("doctor"), v.literal("patient"))),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_role", ["role"]),

  doctorProfiles: defineTable({
    userId: v.id("users"),
    fullName: v.string(),
    specialization: v.string(),
    bio: v.optional(v.string()),
    profileImage: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  availabilitySlots: defineTable({
    doctorId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
    startTime: v.string(), // HH:mm
    endTime: v.string(), // HH:mm
    isBooked: v.boolean(),
  })
    .index("by_doctorId", ["doctorId"])
    .index("by_doctorId_and_date", ["doctorId", "date"]),

  appointments: defineTable({
    patientId: v.id("users"),
    doctorId: v.id("users"),
    slotId: v.id("availabilitySlots"),
    date: v.string(), // YYYY-MM-DD
    startTime: v.string(), // HH:mm
    endTime: v.string(), // HH:mm
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("rejected"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_patientId", ["patientId"])
    .index("by_doctorId", ["doctorId"])
    .index("by_slotId", ["slotId"]),
});
