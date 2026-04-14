"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { STATUS_STYLES } from "../../../lib/utils";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";

export default function AppointmentsPage() {
  const user = useQuery(api.users.getCurrentUser);
  const { results: appointments, status, loadMore } = usePaginatedQuery(
    api.appointments.getMyAppointments,
    {},
    { initialNumItems: 10 },
  );
  const updateStatus = useMutation(api.appointments.updateAppointmentStatus);
  const addNotes = useMutation(api.appointments.addDoctorNotes);

  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  if (user === undefined || status === "LoadingFirstPage") {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-slate-200" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200" />
        ))}
      </div>
    );
  }

  const isDoctor = user?.role === "doctor";

  async function handleStatusUpdate(id: Id<"appointments">, newStatus: "confirmed" | "rejected" | "cancelled" | "completed") {
    try {
      await updateStatus({ appointmentId: id, status: newStatus });
      toast.success(`Appointment ${newStatus}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function handleAddNotes(id: Id<"appointments">) {
    const text = notesMap[id]?.trim();
    if (!text) return toast.error("Please enter notes");
    try {
      await addNotes({ appointmentId: id, notes: text });
      toast.success("Notes saved");
      setNotesMap((prev) => ({ ...prev, [id]: "" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save notes");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">
        {isDoctor ? "Appointments" : "My Appointments"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {isDoctor ? "Manage your patient appointments" : "View and manage your appointments"}
      </p>

      {appointments.length === 0 ? (
        <p className="mt-8 text-center text-slate-500">No appointments yet.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {appointments.map((appt) => (
            <Card key={appt._id} className="!p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {appt.date} &middot; {appt.startTime} - {appt.endTime}
                  </p>
                  {appt.reason && <p className="mt-1 text-sm text-slate-600">Reason: {appt.reason}</p>}
                  {appt.notes && <p className="mt-1 text-sm text-slate-600">Notes: {appt.notes}</p>}
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[appt.status]}`}>
                  {appt.status}
                </span>
              </div>

              {isDoctor && appt.status === "pending" && (
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => handleStatusUpdate(appt._id, "confirmed")} className="!bg-green-600 hover:!bg-green-700">Confirm</Button>
                  <Button onClick={() => handleStatusUpdate(appt._id, "rejected")} className="!bg-red-600 hover:!bg-red-700">Reject</Button>
                </div>
              )}

              {isDoctor && appt.status === "confirmed" && (
                <div className="mt-4 space-y-2">
                  <Button onClick={() => handleStatusUpdate(appt._id, "completed")}>Mark Complete</Button>
                  <div className="flex gap-2">
                    <Input
                      value={notesMap[appt._id] ?? ""}
                      onChange={(e) => setNotesMap((prev) => ({ ...prev, [appt._id]: e.target.value }))}
                      placeholder="Add notes..."
                    />
                    <Button variant="secondary" onClick={() => handleAddNotes(appt._id)}>Save</Button>
                  </div>
                </div>
              )}

              {!isDoctor && (appt.status === "pending" || appt.status === "confirmed") && (
                <div className="mt-4">
                  <Button variant="danger" onClick={() => handleStatusUpdate(appt._id, "cancelled")}>Cancel Appointment</Button>
                </div>
              )}
            </Card>
          ))}

          {status === "CanLoadMore" && (
            <div className="flex justify-center pt-2">
              <Button variant="secondary" onClick={() => loadMore(10)}>Load More</Button>
            </div>
          )}
          {status === "LoadingMore" && (
            <div className="flex justify-center pt-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
