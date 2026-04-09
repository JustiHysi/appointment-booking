"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";

export default function DoctorsPage() {
  const doctors = useQuery(api.doctors.listDoctors);

  if (doctors === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-40 rounded bg-slate-200" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Find a Doctor</h1>
      <p className="mt-1 text-sm text-slate-500">
        Browse available doctors and book an appointment
      </p>

      {doctors.length === 0 ? (
        <p className="mt-8 text-center text-slate-500">
          No doctors available at the moment.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doctor) => (
            <Link
              key={doctor._id}
              href={`/dashboard/doctors/${doctor._id}`}
              className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-200/60 transition-all hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-600">
                  {(doctor.profile?.fullName ?? doctor.name ?? "D")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-slate-900">
                    {doctor.profile?.fullName ?? doctor.name ?? "Doctor"}
                  </p>
                  {doctor.profile?.specialization && (
                    <p className="text-sm text-slate-500">
                      {doctor.profile.specialization}
                    </p>
                  )}
                </div>
              </div>
              {doctor.profile?.bio && (
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                  {doctor.profile.bio}
                </p>
              )}
              {!doctor.profile && (
                <p className="mt-3 text-sm italic text-slate-400">
                  Profile not yet set up
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
