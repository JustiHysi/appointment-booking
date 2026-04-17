"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input, Label, Textarea } from "../../../components/ui/input";

export default function DoctorProfile() {
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

  if (profile === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-slate-200" />
        <div className="h-64 rounded-2xl bg-slate-200" />
      </div>
    );
  }

  const hasProfile = profile !== null;
  const showForm = !hasProfile || editing;

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !specialization.trim()) {
      return toast.error("Full name and specialization are required");
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
        toast.success("Profile updated!");
        setEditing(false);
      } else {
        await createProfile({
          fullName: fullName.trim(),
          specialization: specialization.trim(),
          bio: bio.trim() || undefined,
          profileImage: profileImageId,
        });
        toast.success("Profile created!");
      }
      setImageFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
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
            {hasProfile ? "Your doctor profile information" : "Set up your profile so patients can find you"}
          </p>
        </div>
        {hasProfile && !editing && <Button onClick={() => setEditing(true)}>Edit Profile</Button>}
      </div>

      {hasProfile && !editing ? (
        <Card className="mt-6">
          <div className="flex items-center gap-4">
            {profile.imageUrl ? (
              <img src={profile.imageUrl} alt={profile.fullName} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-600">
                {profile.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{profile.fullName}</h2>
              <p className="text-slate-500">{profile.specialization}</p>
            </div>
          </div>
          {profile.bio && <p className="mt-4 text-slate-600">{profile.bio}</p>}
        </Card>
      ) : showForm ? (
        <form onSubmit={handleSubmit} className="mt-6">
          <Card className="space-y-4">
            <div>
              <Label>Profile Photo</Label>
              <div className="mt-1.5 flex items-center gap-4">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  {imagePreview ? "Change Photo" : "Upload Photo"}
                </Button>
              </div>
            </div>

            <div>
              <Label>Full Name *</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Dr. John Smith" className="mt-1.5" />
            </div>
            <div>
              <Label>Specialization *</Label>
              <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} required placeholder="Cardiology, Dermatology, etc." className="mt-1.5" />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Tell patients about your experience..." className="mt-1.5" />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : hasProfile ? "Save Changes" : "Create Profile"}
              </Button>
              {editing && (
                <Button type="button" variant="secondary" onClick={handleCancelEdit}>Cancel</Button>
              )}
            </div>
          </Card>
        </form>
      ) : null}
    </div>
  );
}
