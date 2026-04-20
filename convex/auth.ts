import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ResendOTPPasswordReset } from "./passwordReset";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      reset: ResendOTPPasswordReset,
      profile(params) {
        return {
          email: params.email as string,
          name: params.name as string,
          role: params.role as "doctor" | "patient",
        };
      },
    }),
  ],
});
