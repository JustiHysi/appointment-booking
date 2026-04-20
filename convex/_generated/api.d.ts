/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as appointments from "../appointments.js";
import type * as auth from "../auth.js";
import type * as availability from "../availability.js";
import type * as doctors from "../doctors.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as intake from "../intake.js";
import type * as partnerLocations from "../partnerLocations.js";
import type * as passwordReset from "../passwordReset.js";
import type * as referrals from "../referrals.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  appointments: typeof appointments;
  auth: typeof auth;
  availability: typeof availability;
  doctors: typeof doctors;
  helpers: typeof helpers;
  http: typeof http;
  intake: typeof intake;
  partnerLocations: typeof partnerLocations;
  passwordReset: typeof passwordReset;
  referrals: typeof referrals;
  seed: typeof seed;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
