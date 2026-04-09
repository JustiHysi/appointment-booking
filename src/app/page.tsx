"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const router = useRouter();

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"doctor" | "patient">("patient");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "signUp") {
        if (!name.trim()) {
          setError("Name is required");
          setSubmitting(false);
          return;
        }
        await signIn("password", {
          flow: "signUp",
          email,
          password,
          name,
          role,
        });
        toast.success("Account created successfully!");
      } else {
        await signIn("password", { flow: "signIn", email, password });
        toast.success("Signed in successfully!");
      }
      router.push("/dashboard");
    } catch {
      const msg =
        mode === "signUp"
          ? "Failed to create account. Email may already be in use."
          : "Invalid email or password.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1">
      {/* Hero Side */}
      <div className="relative hidden flex-1 lg:flex">
        <img
          src="/hero.webp"
          alt="Medical professional"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/70" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <h1 className="text-5xl font-bold leading-tight text-white">
            Your Health,
            <br />
            <span className="text-emerald-400">Our Priority</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-slate-300">
            Book appointments with top doctors seamlessly. Modern healthcare
            management at your fingertips.
          </p>
          <div className="mt-8 flex gap-6">
            <div>
              <p className="text-3xl font-bold text-white">500+</p>
              <p className="text-sm text-slate-400">Active Doctors</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">10k+</p>
              <p className="text-sm text-slate-400">Appointments</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">98%</p>
              <p className="text-sm text-slate-400">Satisfaction</p>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Form Side */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 lg:max-w-xl">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="mb-8 lg:hidden">
            <h1 className="text-3xl font-bold text-slate-900">
              Appointment<span className="text-emerald-600">Booking</span>
            </h1>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200/60">
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === "signIn" ? "Welcome back" : "Get started"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "signIn"
                ? "Sign in to manage your appointments"
                : "Create your account to get started"}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === "signUp" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Dr. John Smith"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      I am a
                    </label>
                    <div className="mt-1.5 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setRole("patient")}
                        className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                          role === "patient"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                            : "border-slate-300 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Patient
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("doctor")}
                        className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                          role === "doctor"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                            : "border-slate-300 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Doctor
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="At least 8 characters"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md disabled:opacity-50"
              >
                {submitting
                  ? "Please wait..."
                  : mode === "signIn"
                    ? "Sign In"
                    : "Create Account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              {mode === "signIn" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => {
                      setMode("signUp");
                      setError("");
                    }}
                    className="font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setMode("signIn");
                      setError("");
                    }}
                    className="font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Sign In
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
