"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

export default function DoctorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params.doctorId as Id<"users">;

  const profile = useQuery(api.doctors.getDoctorProfile, { userId: doctorId });
  const slots = useQuery(api.availability.getDoctorAvailability, {
    doctorId,
  });
  const bookAppointment = useMutation(api.appointments.bookAppointment);

  const [reason, setReason] = useState("");
  const [bookingSlotId, setBookingSlotId] = useState<Id<"availabilitySlots"> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (profile === undefined || slots === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-slate-200" />
        <div className="h-32 rounded-2xl bg-slate-200" />
      </div>
    );
  }

  const availableSlots = slots?.filter((s) => !s.isBooked) ?? [];

  // Group slots by date
  const slotsByDate: Record<string, typeof availableSlots> = {};
  for (const slot of availableSlots) {
    if (!slotsByDate[slot.date]) slotsByDate[slot.date] = [];
    slotsByDate[slot.date].push(slot);
  }
  const sortedDates = Object.keys(slotsByDate).sort();

  async function handleBook() {
    if (!bookingSlotId) return;
    setSubmitting(true);
    try {
      await bookAppointment({
        slotId: bookingSlotId,
        reason: reason.trim() || undefined,
      });
      toast.success("Appointment booked successfully!");
      setBookingSlotId(null);
      setReason("");
      router.push("/dashboard/appointments");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to book appointment",
      );
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

      {/* Doctor Profile */}
      <div className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200/60">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-600">
            {(profile?.fullName ?? "D").charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {profile?.fullName ?? "Doctor"}
            </h1>
            {profile?.specialization && (
              <p className="text-slate-500">{profile.specialization}</p>
            )}
          </div>
        </div>
        {profile?.bio && (
          <p className="mt-4 text-slate-600">{profile.bio}</p>
        )}
      </div>

      {/* Available Slots */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Available Slots
        </h2>

        {sortedDates.length === 0 ? (
          <p className="mt-4 text-slate-500">
            No available slots at the moment.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {sortedDates.map((date) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-slate-700">{date}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {slotsByDate[date].map((slot) => (
                    <button
                      key={slot._id}
                      onClick={() => setBookingSlotId(slot._id)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                        bookingSlotId === slot._id
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

      {/* Booking Form */}
      {bookingSlotId && (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200/60">
          <h3 className="text-lg font-semibold text-slate-900">
            Book Appointment
          </h3>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700">
              Reason for visit (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Describe your symptoms or reason for the visit..."
            />
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleBook}
              disabled={submitting}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md disabled:opacity-50"
            >
              {submitting ? "Booking..." : "Confirm Booking"}
            </button>
            <button
              onClick={() => setBookingSlotId(null)}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
