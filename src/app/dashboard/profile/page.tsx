"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import DoctorProfile from "./doctor-profile";
import PatientProfile from "./patient-profile";

export default function ProfilePage() {
  const user = useQuery(api.users.getCurrentUser);

  if (user === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-slate-200" />
        <div className="h-64 rounded-2xl bg-slate-200" />
      </div>
    );
  }

  if (!user) return null;

  return user.role === "doctor" ? <DoctorProfile /> : <PatientProfile />;
}
