"use client";

import { useMutation, useQuery } from "convex/react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";

export default function AvailabilityPage() {
  const slots = useQuery(api.availability.getMyAvailability);
  const addSlot = useMutation(api.availability.addAvailabilitySlot);
  const removeSlot = useMutation(api.availability.removeAvailabilitySlot);

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (slots === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-slate-200" />
        <div className="h-32 rounded-2xl bg-slate-200" />
      </div>
    );
  }

  // Group slots by date
  const slotsByDate: Record<string, typeof slots> = {};
  for (const slot of slots) {
    if (!slotsByDate[slot.date]) slotsByDate[slot.date] = [];
    slotsByDate[slot.date].push(slot);
  }
  const sortedDates = Object.keys(slotsByDate).sort();

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!date || !startTime || !endTime) {
      toast.error("Please fill in all fields");
      return;
    }
    if (startTime >= endTime) {
      toast.error("End time must be after start time");
      return;
    }
    setSubmitting(true);
    try {
      await addSlot({ date, startTime, endTime });
      toast.success("Slot added successfully!");
      setDate("");
      setStartTime("");
      setEndTime("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add slot",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(slotId: typeof slots[number]["_id"]) {
    try {
      await removeSlot({ slotId });
      toast.success("Slot removed");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove slot",
      );
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">
        Manage Availability
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Add or remove your available time slots
      </p>

      {/* Add Slot Form */}
      <form
        onSubmit={handleAdd}
        className="mt-6 rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200/60"
      >
        <h2 className="text-lg font-semibold text-slate-900">Add New Slot</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              End Time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add Slot"}
        </button>
      </form>

      {/* Existing Slots */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Your Slots</h2>

        {sortedDates.length === 0 ? (
          <p className="mt-4 text-slate-500">
            No availability slots yet. Add your first slot above.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {sortedDates.map((d) => (
              <div key={d}>
                <h3 className="text-sm font-medium text-slate-700">{d}</h3>
                <div className="mt-2 space-y-2">
                  {slotsByDate[d].map((slot) => (
                    <div
                      key={slot._id}
                      className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-200/60"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-900">
                          {slot.startTime} - {slot.endTime}
                        </span>
                        {slot.isBooked && (
                          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                            Booked
                          </span>
                        )}
                      </div>
                      {!slot.isBooked && (
                        <button
                          onClick={() => handleRemove(slot._id)}
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
