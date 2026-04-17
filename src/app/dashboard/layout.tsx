"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const user = useQuery(api.users.getCurrentUser);
  const profile = useQuery(
    api.doctors.getDoctorProfile,
    user?._id && user.role === "doctor" ? { userId: user._id } : "skip",
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

  // Doctor onboarding: redirect if no profile
  useEffect(() => {
    if (
      user?.role === "doctor" &&
      profile === null &&
      pathname !== "/dashboard/profile"
    ) {
      router.push("/dashboard/profile");
    }
  }, [user, profile, pathname, router]);

  // Patient onboarding: redirect if no address (needed for geo-routed referrals)
  useEffect(() => {
    if (
      user?.role === "patient" &&
      !user.address &&
      pathname !== "/dashboard/profile"
    ) {
      router.push("/dashboard/profile");
    }
  }, [user, pathname, router]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (user === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  const isDoctor = user?.role === "doctor";

  const navLinks = isDoctor
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/dashboard/profile", label: "My Profile" },
        { href: "/dashboard/availability", label: "Availability" },
        { href: "/dashboard/appointments", label: "Appointments" },
        { href: "/dashboard/referrals", label: "Referrals" },
      ]
    : [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/dashboard/intake", label: "Book Appointment" },
        { href: "/dashboard/doctors", label: "Find Doctors" },
        { href: "/dashboard/appointments", label: "My Appointments" },
        { href: "/dashboard/referrals", label: "My Referrals" },
        { href: "/dashboard/profile", label: "My Profile" },
      ];

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <div className="flex flex-1">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-xl bg-slate-900 p-2 text-white shadow-lg lg:hidden"
        aria-label="Open menu"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-700/50 p-5">
          <div>
            <h2 className="text-lg font-bold text-white">
              Appointment<span className="text-emerald-400">Booking</span>
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                {(user?.name ?? user?.email ?? "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">
                  {user?.name ?? user?.email}
                </p>
                <p className="text-xs capitalize text-slate-400">{user?.role}</p>
              </div>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 p-3">
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    pathname === link.href
                      ? "bg-emerald-600/15 text-emerald-400"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-slate-700/50 p-3">
          <button
            onClick={handleSignOut}
            className="w-full rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-slate-800"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-slate-50 p-4 pt-16 lg:p-8 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
