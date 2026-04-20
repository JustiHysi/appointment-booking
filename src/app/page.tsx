"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Mode = "signIn" | "signUp" | "resetRequest" | "resetVerify";

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"doctor" | "patient">("patient");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) router.push("/dashboard");
  }, [isAuthenticated, router]);

  if (isAuthenticated || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  function switchMode(newMode: Mode) {
    setMode(newMode);
    setError("");
    setCode("");
    setNewPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "signUp") {
        if (!name.trim()) {
          showError("Name is required");
          return;
        }
        await signIn("password", { flow: "signUp", email, password, name, role });
        toast.success("Account created!");
        router.push("/dashboard");
      } else if (mode === "signIn") {
        await signIn("password", { flow: "signIn", email, password });
        toast.success("Signed in!");
        router.push("/dashboard");
      } else if (mode === "resetRequest") {
        await signIn("password", { email, flow: "reset" });
        toast.success("Check your email for the reset code");
        switchMode("resetVerify");
      } else if (mode === "resetVerify") {
        if (newPassword.length < 8) {
          showError("New password must be at least 8 characters");
          return;
        }
        await signIn("password", {
          email,
          code,
          newPassword,
          flow: "reset-verification",
        });
        toast.success("Password reset! You're now signed in.");
        router.push("/dashboard");
      }
    } catch (err) {
      showError(friendlyErrorMessage(mode, err));
    } finally {
      setSubmitting(false);
    }
  }

  function showError(msg: string) {
    setError(msg);
    toast.error(msg);
  }

  const titles: Record<Mode, { title: string; subtitle: string }> = {
    signIn: { title: "Welcome back", subtitle: "Sign in to manage your appointments" },
    signUp: { title: "Get started", subtitle: "Create your account to get started" },
    resetRequest: { title: "Reset your password", subtitle: "Enter your email and we'll send you a code" },
    resetVerify: { title: "Enter your code", subtitle: `We sent a 6-digit code to ${email}` },
  };

  const { title, subtitle } = titles[mode];

  return (
    <div className="flex flex-1">
      <div className="relative hidden flex-1 lg:flex">
        <img src="/hero.webp" alt="Medical professional" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-slate-900/70" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <h1 className="text-5xl font-bold leading-tight text-white">
            Your Health,
            <br />
            <span className="text-emerald-400">Our Priority</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-slate-300">
            Book appointments with top doctors seamlessly. Modern healthcare management at your fingertips.
          </p>
          <div className="mt-8 flex gap-6">
            <Stat value="500+" label="Active Doctors" />
            <Stat value="10k+" label="Appointments" />
            <Stat value="98%" label="Satisfaction" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 lg:max-w-xl">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <h1 className="text-3xl font-bold text-slate-900">
              Appointment<span className="text-emerald-600">Booking</span>
            </h1>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200/60">
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === "signUp" && (
                <>
                  <Field label="Full Name">
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                      className={inputClass} placeholder="Dr. John Smith" />
                  </Field>
                  <Field label="I am a">
                    <div className="flex gap-3">
                      <RoleButton selected={role === "patient"} onClick={() => setRole("patient")}>Patient</RoleButton>
                      <RoleButton selected={role === "doctor"} onClick={() => setRole("doctor")}>Doctor</RoleButton>
                    </div>
                  </Field>
                </>
              )}

              {mode !== "resetVerify" && (
                <Field label="Email">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className={inputClass} placeholder="you@example.com" />
                </Field>
              )}

              {(mode === "signIn" || mode === "signUp") && (
                <Field label="Password">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                    minLength={8} className={inputClass} placeholder="At least 8 characters" />
                </Field>
              )}

              {mode === "resetVerify" && (
                <>
                  <Field label="6-digit code">
                    <input type="text" value={code} onChange={(e) => setCode(e.target.value)} required
                      maxLength={6} pattern="\d{6}" className={`${inputClass} text-center text-lg tracking-widest`}
                      placeholder="000000" />
                  </Field>
                  <Field label="New password">
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      required minLength={8} className={inputClass} placeholder="At least 8 characters" />
                  </Field>
                </>
              )}

              {mode === "signIn" && (
                <button type="button" onClick={() => switchMode("resetRequest")}
                  className="block text-right text-xs font-medium text-emerald-600 hover:text-emerald-700">
                  Forgot password?
                </button>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button type="submit" disabled={submitting}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md disabled:opacity-50">
                {submitting ? "Please wait..." : (
                  mode === "signIn" ? "Sign In"
                    : mode === "signUp" ? "Create Account"
                      : mode === "resetRequest" ? "Send Reset Code"
                        : "Reset Password"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              {mode === "signIn" && (
                <>Don&apos;t have an account?{" "}
                  <ModeLink onClick={() => switchMode("signUp")}>Sign Up</ModeLink>
                </>
              )}
              {mode === "signUp" && (
                <>Already have an account?{" "}
                  <ModeLink onClick={() => switchMode("signIn")}>Sign In</ModeLink>
                </>
              )}
              {(mode === "resetRequest" || mode === "resetVerify") && (
                <ModeLink onClick={() => switchMode("signIn")}>← Back to sign in</ModeLink>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function friendlyErrorMessage(mode: Mode, err: unknown): string {
  const raw = err instanceof Error ? err.message : "";

  // Detect specific Convex Auth errors by substring match on the raw stack
  if (raw.includes("InvalidAccountId")) {
    return "No account found with that email.";
  }
  if (raw.includes("InvalidSecret")) {
    return "The code is invalid or has expired.";
  }
  if (raw.includes("TooManyFailedAttempts")) {
    return "Too many attempts. Please try again in a few minutes.";
  }
  if (raw.includes("Password is too short")) {
    return "Password must be at least 8 characters.";
  }

  // Generic fallback per flow
  switch (mode) {
    case "signUp":
      return "Could not create account. The email may already be registered.";
    case "signIn":
      return "Invalid email or password.";
    case "resetRequest":
      return "Could not send reset email. Please check the address and try again.";
    case "resetVerify":
      return "Invalid or expired code. Please try again.";
  }
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function RoleButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
        selected ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
          : "border-slate-300 text-slate-600 hover:bg-slate-50"
      }`}>
      {children}
    </button>
  );
}

function ModeLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="font-semibold text-emerald-600 hover:text-emerald-700">
      {children}
    </button>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}
