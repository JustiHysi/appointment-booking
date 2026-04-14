"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { groupByDate } from "../../../../lib/utils";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { Textarea, Label } from "../../../../components/ui/input";

export default function DoctorDetailPage() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const typedDoctorId = doctorId as Id<"users">;
  const intakeId = searchParams.get("intakeId") as Id<"healthIntake"> | null;

  const profile = useQuery(api.doctors.getDoctorProfile, { userId: typedDoctorId });
  const slots = useQuery(api.availability.getDoctorAvailability, { doctorId: typedDoctorId });
  const intake = useQuery(api.intake.getHealthIntake, intakeId ? { intakeId } : "skip");
  const bookAppointment = useMutation(api.appointments.bookAppointment);

  const [reason, setReason] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Id<"availabilitySlots"> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (profile === undefined || slots === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-slate-200" />
        <div className="h-32 rounded-2xl bg-slate-200" />
      </div>
    );
  }

  const available = slots?.filter((s) => !s.isBooked) ?? [];
  const { dates, byDate } = groupByDate(available);

  async function handleBook() {
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      await bookAppointment({
        slotId: selectedSlot,
        reason: (intake?.chiefComplaint ?? reason.trim()) || undefined,
        intakeId: intakeId ?? undefined,
      });
      toast.success("Appointment booked!");
      router.push("/dashboard/appointments");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 text-sm font-medium text-emerald-600 hover:text-emerald-700"
      >
        &larr; Back to doctors
      </button>

      <Card>
        <div className="flex items-center gap-4">
          {profile?.imageUrl ? (
            <img src={profile.imageUrl} alt={profile.fullName} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-600">
              {(profile?.fullName ?? "D").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{profile?.fullName ?? "Doctor"}</h1>
            {profile?.specialization && <p className="text-slate-500">{profile.specialization}</p>}
          </div>
        </div>
        {profile?.bio && <p className="mt-4 text-slate-600">{profile.bio}</p>}
      </Card>

      {intake && (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
          <h3 className="text-sm font-semibold text-emerald-800">Health Intake Summary</h3>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <p className="text-slate-600">Complaint: <span className="text-slate-900">{intake.chiefComplaint}</span></p>
            <p className="text-slate-600">Pain: <span className="font-bold text-slate-900">{intake.painLevel}/10</span></p>
            {intake.conditions.length > 0 && (
              <p className="col-span-2 text-slate-600">
                Conditions: <span className="text-slate-900">{intake.conditions.join(", ")}</span>
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">Available Slots</h2>
        {dates.length === 0 ? (
          <p className="mt-4 text-slate-500">No available slots at the moment.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {dates.map((date) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-slate-700">{date}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {byDate[date].map((slot) => (
                    <button
                      key={slot._id}
                      onClick={() => setSelectedSlot(slot._id)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                        selectedSlot === slot._id
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                          : "border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {slot.startTime} - {slot.endTime}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedSlot && (
        <Card className="mt-6">
          <h3 className="text-lg font-semibold text-slate-900">Book Appointment</h3>
          {!intakeId && (
            <div className="mt-4">
              <Label>Reason for visit (optional)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Describe your symptoms or reason..."
                className="mt-1.5"
              />
            </div>
          )}
          <div className="mt-4 flex gap-3">
            <Button onClick={handleBook} disabled={submitting}>
              {submitting ? "Booking..." : "Confirm Booking"}
            </Button>
            <Button variant="secondary" onClick={() => setSelectedSlot(null)}>Cancel</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
