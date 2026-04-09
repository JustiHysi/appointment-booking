"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export default function AppointmentsPage() {
  const user = useQuery(api.users.getCurrentUser);
  const appointments = useQuery(api.appointments.getMyAppointments);
  const updateStatus = useMutation(api.appointments.updateAppointmentStatus);
  const addNotes = useMutation(api.appointments.addDoctorNotes);

  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  if (user === undefined || appointments === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-gray-200" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-200" />
        ))}
      </div>
    );
  }

  const isDoctor = user?.role === "doctor";

  async function handleStatusUpdate(
    appointmentId: Id<"appointments">,
    status: "confirmed" | "rejected" | "cancelled" | "completed",
  ) {
    try {
      await updateStatus({ appointmentId, status });
      toast.success(`Appointment ${status}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status",
      );
    }
  }

  async function handleAddNotes(appointmentId: Id<"appointments">) {
    const notes = notesMap[appointmentId];
    if (!notes?.trim()) {
      toast.error("Please enter notes");
      return;
    }
    try {
      await addNotes({ appointmentId, notes: notes.trim() });
      toast.success("Notes added successfully");
      setNotesMap((prev) => ({ ...prev, [appointmentId]: "" }));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add notes",
      );
    }
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    completed: "bg-blue-100 text-blue-700",
    cancelled: "bg-gray-100 text-gray-500",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        {isDoctor ? "Appointments" : "My Appointments"}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {isDoctor
          ? "Manage your patient appointments"
          : "View and manage your appointments"}
      </p>

      {appointments.length === 0 ? (
        <p className="mt-8 text-center text-gray-500">
          No appointments yet.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {appointments.map((appt) => (
            <div
              key={appt._id}
              className="rounded-xl bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {appt.date} &middot; {appt.startTime} - {appt.endTime}
                  </p>
                  {appt.reason && (
                    <p className="mt-1 text-sm text-gray-600">
                      Reason: {appt.reason}
                    </p>
                  )}
                  {appt.notes && (
                    <p className="mt-1 text-sm text-gray-600">
                      Notes: {appt.notes}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[appt.status]}`}
                >
                  {appt.status}
                </span>
              </div>

              {/* Doctor Actions */}
              {isDoctor && appt.status === "pending" && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleStatusUpdate(appt._id, "confirmed")}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(appt._id, "rejected")}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              )}

              {isDoctor && appt.status === "confirmed" && (
                <div className="mt-4 space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleStatusUpdate(appt._id, "completed")
                      }
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Mark Complete
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={notesMap[appt._id] ?? ""}
                      onChange={(e) =>
                        setNotesMap((prev) => ({
                          ...prev,
                          [appt._id]: e.target.value,
                        }))
                      }
                      placeholder="Add notes..."
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleAddNotes(appt._id)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Save Notes
                    </button>
                  </div>
                </div>
              )}

              {/* Patient Actions */}
              {!isDoctor &&
                (appt.status === "pending" ||
                  appt.status === "confirmed") && (
                  <div className="mt-4">
                    <button
                      onClick={() =>
                        handleStatusUpdate(appt._id, "cancelled")
                      }
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Cancel Appointment
                    </button>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
