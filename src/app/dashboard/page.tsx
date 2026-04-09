"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { STATUS_STYLES } from "../../lib/utils";

export default function DashboardPage() {
  const user = useQuery(api.users.getCurrentUser);
  const stats = useQuery(api.appointments.getMyAppointmentStats);

  if (user === undefined || stats === undefined) {
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

  const isDoctor = user?.role === "doctor";

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">
        Welcome, {user?.name ?? "User"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {isDoctor ? "Doctor Dashboard" : "Patient Dashboard"}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Upcoming" value={stats.upcoming} color="text-emerald-600" />
        <StatCard label="Total Appointments" value={stats.total} color="text-slate-900" />
        <StatCard label="Completed" value={stats.completed} color="text-green-600" />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {isDoctor ? (
            <>
              <ActionLink href="/dashboard/availability" primary>Manage Availability</ActionLink>
              <ActionLink href="/dashboard/profile">Edit Profile</ActionLink>
            </>
          ) : (
            <ActionLink href="/dashboard/doctors" primary>Find a Doctor</ActionLink>
          )}
          <ActionLink href="/dashboard/appointments">View Appointments</ActionLink>
        </div>
      </div>

      {stats.recentUpcoming.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">
            Upcoming Appointments
          </h2>
          <div className="mt-3 space-y-2">
            {stats.recentUpcoming.map((appt) => (
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
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[appt.status]}`}>
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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200/60">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ActionLink({ href, children, primary }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md"
          : "rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      }
    >
      {children}
    </Link>
  );
}
