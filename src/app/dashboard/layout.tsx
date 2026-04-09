"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { api } from "../../../convex/_generated/api";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const user = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

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
      ]
    : [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/dashboard/doctors", label: "Find Doctors" },
        { href: "/dashboard/appointments", label: "My Appointments" },
      ];

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <div className="flex flex-1">
      {/* Dark Sidebar */}
      <aside className="flex w-64 flex-col bg-slate-900">
        <div className="border-b border-slate-700/50 p-5">
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
      <main className="flex-1 overflow-auto bg-slate-50 p-8">
        {children}
      </main>
    </div>
  );
}
