import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole } from "./helpers";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
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
    const user = await requireRole(ctx, "doctor");

    const existing = await ctx.db
      .query("doctorProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (existing) throw new Error("Profile already exists");

    return await ctx.db.insert("doctorProfiles", {
      userId: user._id,
      ...args,
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
    const user = await requireRole(ctx, "doctor");

    const existing = await ctx.db
      .query("doctorProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
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
    await requireAuth(ctx);

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
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Paginate at the DB level instead of .take(50) so we never fetch
    // more than one page at a time.
    const doctors = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "doctor"))
      .paginate(args.paginationOpts);

    // Enrich each doctor in the page with their profile + image URL.
    // Promise.all keeps the N profile lookups concurrent instead of serial.
    const page = await Promise.all(
      doctors.page.map(async (doctor) => {
        const profile = await ctx.db
          .query("doctorProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", doctor._id))
          .unique();

        const imageUrl = profile?.profileImage
          ? await ctx.storage.getUrl(profile.profileImage)
          : null;

        return {
          ...doctor,
          profile: profile ? { ...profile, imageUrl } : null,
        };
      }),
    );

    // Filter within the current page. Convex doesn't support full-text
    // search in a regular query, so partial matching happens in memory.
    const filtered = args.specialization
      ? page.filter((d) => {
          const term = args.specialization!.toLowerCase();
          return (
            d.profile?.specialization?.toLowerCase().includes(term) ||
            d.profile?.fullName?.toLowerCase().includes(term)
          );
        })
      : page;

    // Preserve pagination metadata (isDone, continueCursor) and swap the
    // page with the filtered results so usePaginatedQuery still works.
    return { ...doctors, page: filtered };
  },
});
