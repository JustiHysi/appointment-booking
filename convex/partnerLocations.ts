import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { requireAuth } from "./helpers";

// Haversine formula: calculates distance in km between two lat/lng points.
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("partnerLocations")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .take(200);
  },
});

export const findClosest = query({
  args: {
    type: v.union(
      v.literal("pharmacy"),
      v.literal("lab"),
      v.literal("imaging_center"),
      v.literal("clinic"),
    ),
    latitude: v.number(),
    longitude: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const partners = await ctx.db
      .query("partnerLocations")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .take(200);

    const active = partners.filter((p) => p.isActive);
    const withDistance = active.map((p) => ({
      ...p,
      distanceKm: haversineKm(args.latitude, args.longitude, p.latitude, p.longitude),
    }));

    withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
    return withDistance.slice(0, args.limit ?? 3);
  },
});

// Seed function for dev/demo. Run from Convex Dashboard: partnerLocations:seed
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("partnerLocations").take(1);
    if (existing.length > 0) {
      return { message: "Partner locations already seeded" };
    }

    const locations = [
      // Pharmacies — Tirana
      { name: "Farmacia Rezarta", type: "pharmacy" as const, address: "Rruga e Kavajës, Tiranë", latitude: 41.3272, longitude: 19.8147, hours: "Mon-Sun 8am-10pm", phone: "+355 4 222 3311" },
      { name: "Farmacia Migena", type: "pharmacy" as const, address: "Bulevardi Zogu I, Tiranë", latitude: 41.3345, longitude: 19.8185, hours: "Mon-Sat 8am-9pm", phone: "+355 4 222 4455" },
      { name: "Farmacia Alba", type: "pharmacy" as const, address: "Rruga Myslym Shyri, Tiranë", latitude: 41.3206, longitude: 19.8117, hours: "Mon-Sun 24h", phone: "+355 4 222 5566" },
      { name: "Farmacia Kristal", type: "pharmacy" as const, address: "Rruga e Durrësit, Tiranë", latitude: 41.3301, longitude: 19.8056, hours: "Mon-Sat 7am-9pm", phone: "+355 4 222 7788" },
      { name: "Farmacia Tefta", type: "pharmacy" as const, address: "Rruga Ali Demi, Tiranë", latitude: 41.3189, longitude: 19.8289, hours: "Mon-Sun 8am-11pm", phone: "+355 4 222 9900" },

      // Labs — Intermedica branches
      { name: "Intermedica — Tiranë Qendër", type: "lab" as const, address: "Rruga Ibrahim Rugova 5, Tiranë", latitude: 41.3271, longitude: 19.8189, hours: "Mon-Sat 7am-7pm", phone: "+355 4 451 3000" },
      { name: "Intermedica — Blloku", type: "lab" as const, address: "Rruga Brigada e VIII, Tiranë", latitude: 41.3211, longitude: 19.8163, hours: "Mon-Fri 7am-6pm, Sat 8am-2pm", phone: "+355 4 451 3001" },
      { name: "Intermedica — Durrës", type: "lab" as const, address: "Rruga Tregtare, Durrës", latitude: 41.3231, longitude: 19.4547, hours: "Mon-Sat 7am-6pm", phone: "+355 5 222 4000" },
      { name: "Intermedica — Vlorë", type: "lab" as const, address: "Lungomare, Vlorë", latitude: 40.4686, longitude: 19.4914, hours: "Mon-Fri 7am-6pm", phone: "+355 3 322 5000" },

      // Imaging centers
      { name: "American Hospital 3 — Imaging", type: "imaging_center" as const, address: "Rruga Vorë-Tiranë, Tiranë", latitude: 41.3594, longitude: 19.7194, hours: "Mon-Sat 8am-8pm", phone: "+355 4 235 7535" },
      { name: "Hygeia Hospital Tirana", type: "imaging_center" as const, address: "Autostrada Tiranë-Durrës Km 7, Tiranë", latitude: 41.3613, longitude: 19.7522, hours: "Mon-Sun 24h (Emergency)", phone: "+355 4 239 0000" },
      { name: "Salus Hospital", type: "imaging_center" as const, address: "Rruga e Dibrës 407, Tiranë", latitude: 41.3444, longitude: 19.8361, hours: "Mon-Sat 8am-6pm", phone: "+355 4 242 4444" },

      // Specialist clinics
      { name: "Klinika Mjekësore QSUT", type: "clinic" as const, address: "Rruga Dibrës 372, Tiranë", latitude: 41.3417, longitude: 19.8292, hours: "Mon-Fri 8am-4pm", phone: "+355 4 236 3644" },
      { name: "Continental Hospital", type: "clinic" as const, address: "Rruga Kavajës 116, Tiranë", latitude: 41.3245, longitude: 19.8092, hours: "Mon-Sun 24h", phone: "+355 4 222 7777" },
      { name: "Poliklinika Specialistike No.3", type: "clinic" as const, address: "Rruga Pjetër Budi, Tiranë", latitude: 41.3286, longitude: 19.8244, hours: "Mon-Fri 8am-4pm", phone: "+355 4 236 2500" },
    ];

    for (const loc of locations) {
      await ctx.db.insert("partnerLocations", {
        name: loc.name,
        type: loc.type,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        acceptedTypes: [loc.type],
        operatingHours: loc.hours,
        contactInfo: { phone: loc.phone },
        isActive: true,
      });
    }

    return { message: `Seeded ${locations.length} partner locations` };
  },
});
