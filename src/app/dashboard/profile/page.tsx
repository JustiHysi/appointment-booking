"use client";

import { useMutation, useQuery } from "convex/react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";

export default function ProfilePage() {
  const user = useQuery(api.users.getCurrentUser);
  const profile = useQuery(
    api.doctors.getDoctorProfile,
    user?._id ? { userId: user._id } : "skip",
  );
  const createProfile = useMutation(api.doctors.createDoctorProfile);

  const [fullName, setFullName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setSpecialization(profile.specialization);
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  if (user === undefined || profile === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-64 rounded-xl bg-gray-200" />
      </div>
    );
  }

  if (user?.role !== "doctor") {
    return (
      <div className="text-center text-gray-500">
        This page is only for doctors.
      </div>
    );
  }

  const hasProfile = profile !== null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !specialization.trim()) {
      toast.error("Full name and specialization are required");
      return;
    }
    setSubmitting(true);
    try {
      await createProfile({
        fullName: fullName.trim(),
        specialization: specialization.trim(),
        bio: bio.trim() || undefined,
      });
      toast.success("Profile created successfully!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        {hasProfile ? "Your Profile" : "Create Your Profile"}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {hasProfile
          ? "Your doctor profile information"
          : "Set up your profile so patients can find you"}
      </p>

      {hasProfile ? (
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
              {profile.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {profile.fullName}
              </h2>
              <p className="text-gray-500">{profile.specialization}</p>
            </div>
          </div>
          {profile.bio && (
            <p className="mt-4 text-gray-600">{profile.bio}</p>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-xl bg-white p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Dr. John Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Specialization *
              </label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Cardiology, Dermatology, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Tell patients about your experience and expertise..."
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Profile"}
          </button>
        </form>
      )}
    </div>
  );
}
