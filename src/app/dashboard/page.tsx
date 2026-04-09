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
      <h1 className="text-2xl font-bold text-gray-900">
        Welcome, {user?.name ?? "User"}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {isDoctor ? "Doctor Dashboard" : "Patient Dashboard"}
      </p>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Upcoming</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">
            {upcoming?.length ?? 0}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Appointments</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {appointments?.length ?? 0}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {appointments?.filter((a) => a.status === "completed").length ?? 0}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="mt-3 flex gap-3">
          {isDoctor ? (
            <>
              <Link
                href="/dashboard/availability"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Manage Availability
              </Link>
              <Link
                href="/dashboard/profile"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit Profile
              </Link>
            </>
          ) : (
            <Link
              href="/dashboard/doctors"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Find a Doctor
            </Link>
          )}
          <Link
            href="/dashboard/appointments"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View Appointments
          </Link>
        </div>
      </div>

      {/* Recent Appointments */}
      {upcoming && upcoming.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Upcoming Appointments
          </h2>
          <div className="mt-3 space-y-2">
            {upcoming.slice(0, 5).map((appt) => (
              <div
                key={appt._id}
                className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {appt.date} at {appt.startTime} - {appt.endTime}
                  </p>
                  {appt.reason && (
                    <p className="text-xs text-gray-500">{appt.reason}</p>
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
      <div className="h-8 w-48 rounded bg-gray-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-200" />
        ))}
      </div>
    </div>
  );
}
