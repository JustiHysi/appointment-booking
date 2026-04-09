import { MutationCtx, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "./_generated/dataModel";

export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  role: "doctor" | "patient",
): Promise<Doc<"users">> {
  const userId = await requireAuth(ctx);
  const user = await ctx.db.get(userId);
  if (!user || user.role !== role) {
    throw new Error(`Requires ${role} role`);
  }
  return user;
}
