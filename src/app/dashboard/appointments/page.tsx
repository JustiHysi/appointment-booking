"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { STATUS_STYLES } from "../../../lib/utils";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input, Label, Select, Textarea } from "../../../components/ui/input";

const URGENCY_OPTIONS = [
  { value: "routine", label: "Routine" },
  { value: "urgent", label: "Urgent" },
  { value: "emergency", label: "Emergency" },
] as const;

const REFERRAL_TYPES = [
  { value: "pharmacy", label: "Pharmacy" },
  { value: "lab", label: "Lab" },
  { value: "imaging", label: "Imaging" },
  { value: "specialist", label: "Specialist" },
] as const;

type ReferralType = (typeof REFERRAL_TYPES)[number]["value"];
type Urgency = (typeof URGENCY_OPTIONS)[number]["value"];

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
  const [referralFor, setReferralFor] = useState<Id<"appointments"> | null>(null);

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
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => handleStatusUpdate(appt._id, "completed")}>Mark Complete</Button>
                    <Button variant="secondary" onClick={() => setReferralFor(appt._id)}>Create Referral</Button>
                  </div>
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

              {isDoctor && appt.status === "completed" && (
                <div className="mt-4">
                  <Button variant="secondary" onClick={() => setReferralFor(appt._id)}>Create Referral</Button>
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

      {referralFor && (
        <CreateReferralModal
          appointmentId={referralFor}
          onClose={() => setReferralFor(null)}
        />
      )}
    </div>
  );
}

function CreateReferralModal({
  appointmentId,
  onClose,
}: {
  appointmentId: Id<"appointments">;
  onClose: () => void;
}) {
  const router = useRouter();
  const createReferral = useMutation(api.referrals.createReferral);

  const [type, setType] = useState<ReferralType>("pharmacy");
  const [urgencyLevel, setUrgencyLevel] = useState<Urgency>("routine");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Pharmacy
  const [medications, setMedications] = useState<
    Array<{ name: string; dosage: string; duration: string }>
  >([{ name: "", dosage: "", duration: "" }]);

  // Lab
  const [tests, setTests] = useState("");

  // Imaging
  const [imagingType, setImagingType] = useState("");
  const [bodyRegion, setBodyRegion] = useState("");

  // Specialist
  const [referralSpecialty, setReferralSpecialty] = useState("");
  const [referralReason, setReferralReason] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const details = buildDetails();
      const id = await createReferral({
        appointmentId,
        type,
        details,
        urgencyLevel,
        notes: notes.trim() || undefined,
      });
      toast.success("Referral created!");
      onClose();
      router.push(`/dashboard/referrals/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create referral");
    } finally {
      setSubmitting(false);
    }
  }

  function buildDetails() {
    if (type === "pharmacy") {
      const items = medications
        .filter((m) => m.name.trim())
        .map((m) => ({
          name: m.name.trim(),
          dosage: m.dosage.trim() || undefined,
          duration: m.duration.trim() || undefined,
        }));
      return { items };
    }
    if (type === "lab") {
      return {
        tests: tests.split(",").map((t) => t.trim()).filter(Boolean),
      };
    }
    if (type === "imaging") {
      return {
        imagingType: imagingType.trim() || undefined,
        bodyRegion: bodyRegion.trim() || undefined,
      };
    }
    return {
      referralSpecialty: referralSpecialty.trim() || undefined,
      referralReason: referralReason.trim() || undefined,
    };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Create Referral</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div>
              <Label>Referral Type</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {REFERRAL_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                      type === t.value
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {type === "pharmacy" && (
              <div className="space-y-2">
                <Label>Medications</Label>
                {medications.map((m, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <Input
                      value={m.name}
                      onChange={(e) => {
                        const next = [...medications];
                        next[i].name = e.target.value;
                        setMedications(next);
                      }}
                      placeholder="Name"
                    />
                    <Input
                      value={m.dosage}
                      onChange={(e) => {
                        const next = [...medications];
                        next[i].dosage = e.target.value;
                        setMedications(next);
                      }}
                      placeholder="Dosage"
                    />
                    <Input
                      value={m.duration}
                      onChange={(e) => {
                        const next = [...medications];
                        next[i].duration = e.target.value;
                        setMedications(next);
                      }}
                      placeholder="Duration"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setMedications([...medications, { name: "", dosage: "", duration: "" }])}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                >
                  + Add another
                </button>
              </div>
            )}

            {type === "lab" && (
              <div>
                <Label>Tests (comma-separated)</Label>
                <Input
                  value={tests}
                  onChange={(e) => setTests(e.target.value)}
                  placeholder="CBC, Lipid panel, HbA1c"
                  className="mt-1.5"
                />
              </div>
            )}

            {type === "imaging" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Imaging type</Label>
                  <Select
                    value={imagingType}
                    onChange={(e) => setImagingType(e.target.value)}
                    className="mt-1.5"
                  >
                    <option value="">Select...</option>
                    <option value="X-ray">X-ray</option>
                    <option value="MRI">MRI</option>
                    <option value="CT">CT</option>
                    <option value="Ultrasound">Ultrasound</option>
                  </Select>
                </div>
                <div>
                  <Label>Body region</Label>
                  <Input
                    value={bodyRegion}
                    onChange={(e) => setBodyRegion(e.target.value)}
                    placeholder="e.g. Chest"
                    className="mt-1.5"
                  />
                </div>
              </div>
            )}

            {type === "specialist" && (
              <div className="space-y-3">
                <div>
                  <Label>Specialty</Label>
                  <Input
                    value={referralSpecialty}
                    onChange={(e) => setReferralSpecialty(e.target.value)}
                    placeholder="e.g. Cardiology"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Reason for referral</Label>
                  <Textarea
                    value={referralReason}
                    onChange={(e) => setReferralReason(e.target.value)}
                    rows={2}
                    placeholder="Brief clinical reason"
                    className="mt-1.5"
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Urgency</Label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {URGENCY_OPTIONS.map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => setUrgencyLevel(u.value)}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                      urgencyLevel === u.value
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Doctor notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional instructions or context for the partner"
                className="mt-1.5"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Referral"}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
