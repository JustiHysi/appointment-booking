"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { api } from "../../../convex/_generated/api";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const user = useQuery(api.users.getCurrentUser);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push("/");
    return null;
  }

  if (user === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
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
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-bold text-gray-900">Appointment Booking</h2>
          <p className="text-xs text-gray-500">
            {user?.name ?? user?.email} &middot;{" "}
            <span className="capitalize">{user?.role}</span>
          </p>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleSignOut}
            className="w-full rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50 p-6">
        {children}
      </main>
    </div>
  );
}
