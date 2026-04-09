import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const createDoctorProfile = mutation({
  args: {
    fullName: v.string(),
    specialization: v.string(),
    bio: v.optional(v.string()),
    profileImage: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "doctor") {
      throw new Error("Only doctors can create a profile");
    }

    const existing = await ctx.db
      .query("doctorProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (existing) throw new Error("Doctor profile already exists");

    return await ctx.db.insert("doctorProfiles", {
      userId,
      fullName: args.fullName,
      specialization: args.specialization,
      bio: args.bio,
      profileImage: args.profileImage,
    });
  },
});

export const updateDoctorProfile = mutation({
  args: {
    fullName: v.string(),
    specialization: v.string(),
    bio: v.optional(v.string()),
    profileImage: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "doctor") {
      throw new Error("Only doctors can update a profile");
    }

    const existing = await ctx.db
      .query("doctorProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!existing) throw new Error("No profile to update");

    await ctx.db.patch(existing._id, {
      fullName: args.fullName,
      specialization: args.specialization,
      bio: args.bio,
      profileImage: args.profileImage ?? existing.profileImage,
    });
  },
});

export const getDoctorProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const requesterId = await getAuthUserId(ctx);
    if (!requesterId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("doctorProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!profile) return null;

    const imageUrl = profile.profileImage
      ? await ctx.storage.getUrl(profile.profileImage)
      : null;

    return { ...profile, imageUrl };
  },
});

export const listDoctors = query({
  args: {
    specialization: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const doctors = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "doctor"))
      .take(50);

    const doctorsWithProfiles = await Promise.all(
      doctors.map(async (doctor) => {
        const profile = await ctx.db
          .query("doctorProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", doctor._id))
          .unique();

        const imageUrl = profile?.profileImage
          ? await ctx.storage.getUrl(profile.profileImage)
          : null;

        return { ...doctor, profile: profile ? { ...profile, imageUrl } : null };
      }),
    );

    // Filter by specialization client-side (case-insensitive partial match)
    if (args.specialization) {
      const search = args.specialization.toLowerCase();
      return doctorsWithProfiles.filter(
        (d) =>
          d.profile?.specialization?.toLowerCase().includes(search) ||
          d.profile?.fullName?.toLowerCase().includes(search),
      );
    }

    return doctorsWithProfiles;
  },
});
