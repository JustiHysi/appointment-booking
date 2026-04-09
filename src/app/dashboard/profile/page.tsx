"use client";

import { useMutation, useQuery } from "convex/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export default function ProfilePage() {
  const user = useQuery(api.users.getCurrentUser);
  const profile = useQuery(
    api.doctors.getDoctorProfile,
    user?._id ? { userId: user._id } : "skip",
  );
  const createProfile = useMutation(api.doctors.createDoctorProfile);
  const updateProfile = useMutation(api.doctors.updateDoctorProfile);
  const generateUploadUrl = useMutation(api.doctors.generateUploadUrl);

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setSpecialization(profile.specialization);
      setBio(profile.bio ?? "");
      setImagePreview(profile.imageUrl ?? null);
    }
  }, [profile]);

  if (user === undefined || profile === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-slate-200" />
        <div className="h-64 rounded-2xl bg-slate-200" />
      </div>
    );
  }

  if (user?.role !== "doctor") {
    return (
      <div className="text-center text-slate-500">
        This page is only for doctors.
      </div>
    );
  }

  const hasProfile = profile !== null;
  const showForm = !hasProfile || editing;

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !specialization.trim()) {
      toast.error("Full name and specialization are required");
      return;
    }
    setSubmitting(true);
    try {
      let profileImageId: Id<"_storage"> | undefined;

      if (imageFile) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": imageFile.type },
          body: imageFile,
        });
        const { storageId } = await result.json();
        profileImageId = storageId;
      }

      if (hasProfile) {
        await updateProfile({
          fullName: fullName.trim(),
          specialization: specialization.trim(),
          bio: bio.trim() || undefined,
          profileImage: profileImageId,
        });
        toast.success("Profile updated successfully!");
        setEditing(false);
      } else {
        await createProfile({
          fullName: fullName.trim(),
          specialization: specialization.trim(),
          bio: bio.trim() || undefined,
          profileImage: profileImageId,
        });
        toast.success("Profile created successfully!");
      }
      setImageFile(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancelEdit() {
    setEditing(false);
    setImageFile(null);
    if (profile) {
      setFullName(profile.fullName);
      setSpecialization(profile.specialization);
      setBio(profile.bio ?? "");
      setImagePreview(profile.imageUrl ?? null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {hasProfile ? "Your Profile" : "Create Your Profile"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {hasProfile
              ? "Your doctor profile information"
              : "Set up your profile so patients can find you"}
          </p>
        </div>
        {hasProfile && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md"
          >
            Edit Profile
          </button>
        )}
      </div>

      {hasProfile && !editing ? (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200/60">
          <div className="flex items-center gap-4">
            {profile.imageUrl ? (
              <img
                src={profile.imageUrl}
                alt={profile.fullName}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-600">
                {profile.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {profile.fullName}
              </h2>
              <p className="text-slate-500">{profile.specialization}</p>
            </div>
          </div>
          {profile.bio && (
            <p className="mt-4 text-slate-600">{profile.bio}</p>
          )}
        </div>
      ) : showForm ? (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200/60"
        >
          <div className="space-y-4">
            {/* Profile Image Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Profile Photo
              </label>
              <div className="mt-1.5 flex items-center gap-4">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  {imagePreview ? "Change Photo" : "Upload Photo"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Full Name *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Dr. John Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Specialization *
              </label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Cardiology, Dermatology, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Tell patients about your experience and expertise..."
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : hasProfile
                  ? "Save Changes"
                  : "Create Profile"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : null}
    </div>
  );
}
