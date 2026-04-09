"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";

export default function DashboardPage() {
  const user = useQuery(api.users.getCurrentUser);
  const appointments = useQuery(api.appointments.getMyAppointments);

  if (user === undefined || appointments === undefined) {
    return <LoadingSkeleton />;
  }

  const isDoctor = user?.role === "doctor";

  const upcoming = appointments?.filter(
    (a) => a.status === "pending" || a.status === "confirmed",
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">
        Welcome, {user?.name ?? "User"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {isDoctor ? "Doctor Dashboard" : "Patient Dashboard"}
      </p>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200/60">
          <p className="text-sm text-slate-500">Upcoming</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">
            {upcoming?.length ?? 0}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200/60">
          <p className="text-sm text-slate-500">Total Appointments</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {appointments?.length ?? 0}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200/60">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="mt-1 text-3xl font-bold text-green-600">
            {appointments?.filter((a) => a.status === "completed").length ?? 0}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
        <div className="mt-3 flex gap-3">
          {isDoctor ? (
            <>
              <Link
                href="/dashboard/availability"
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md"
              >
                Manage Availability
              </Link>
              <Link
                href="/dashboard/profile"
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Edit Profile
              </Link>
            </>
          ) : (
            <Link
              href="/dashboard/doctors"
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md"
            >
              Find a Doctor
            </Link>
          )}
          <Link
            href="/dashboard/appointments"
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            View Appointments
          </Link>
        </div>
      </div>

      {/* Recent Appointments */}
      {upcoming && upcoming.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">
            Upcoming Appointments
          </h2>
          <div className="mt-3 space-y-2">
            {upcoming.slice(0, 5).map((appt) => (
              <div
                key={appt._id}
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-200/60"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {appt.date} at {appt.startTime} - {appt.endTime}
                  </p>
                  {appt.reason && (
                    <p className="text-xs text-slate-500">{appt.reason}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    appt.status === "confirmed"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
