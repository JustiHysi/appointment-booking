"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";

export default function DoctorsPage() {
  const doctors = useQuery(api.doctors.listDoctors);

  if (doctors === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-40 rounded bg-gray-200" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-200" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Find a Doctor</h1>
      <p className="mt-1 text-sm text-gray-500">
        Browse available doctors and book an appointment
      </p>

      {doctors.length === 0 ? (
        <p className="mt-8 text-center text-gray-500">
          No doctors available at the moment.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doctor) => (
            <Link
              key={doctor._id}
              href={`/dashboard/doctors/${doctor._id}`}
              className="rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600">
                  {(doctor.profile?.fullName ?? doctor.name ?? "D")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {doctor.profile?.fullName ?? doctor.name ?? "Doctor"}
                  </p>
                  {doctor.profile?.specialization && (
                    <p className="text-sm text-gray-500">
                      {doctor.profile.specialization}
                    </p>
                  )}
                </div>
              </div>
              {doctor.profile?.bio && (
                <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                  {doctor.profile.bio}
                </p>
              )}
              {!doctor.profile && (
                <p className="mt-3 text-sm italic text-gray-400">
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
