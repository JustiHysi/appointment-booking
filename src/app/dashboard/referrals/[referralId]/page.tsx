"use client";

import { useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { Textarea } from "../../../../components/ui/input";

const PartnersMap = dynamic(() => import("../../../../components/map/partners-map"), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse rounded-xl bg-slate-200" />,
});

const STATUS_STYLES: Record<string, string> = {
  issued: "bg-yellow-100 text-yellow-700",
  pending: "bg-blue-100 text-blue-700",
  accepted: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  completed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-slate-100 text-slate-500",
};

const URGENCY_STYLES: Record<string, string> = {
  routine: "bg-slate-100 text-slate-700",
  urgent: "bg-yellow-100 text-yellow-700",
  emergency: "bg-red-100 text-red-700",
};

export default function ReferralDetailPage() {
  const { referralId } = useParams<{ referralId: string }>();
  const router = useRouter();
  const typedId = referralId as Id<"referrals">;

  const user = useQuery(api.users.getCurrentUser);
  const referral = useQuery(api.referrals.getReferral, { referralId: typedId });
  const suggestions = useQuery(api.referrals.getSuggestedLocations, { referralId: typedId });
  const partnerView = useQuery(api.referrals.getPartnerView, { referralId: typedId });

  const chooseLocation = useMutation(api.referrals.chooseLocation);
  const updateStatus = useMutation(api.referrals.updateStatus);

  const [selectedId, setSelectedId] = useState<Id<"partnerLocations"> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPartnerView, setShowPartnerView] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  if (user === undefined || referral === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-slate-200" />
        <div className="h-32 rounded-2xl bg-slate-200" />
      </div>
    );
  }

  if (referral === null) {
    return <div className="text-center text-slate-500">Referral not found.</div>;
  }

  const isPatient = user?.role === "patient";
  const isDoctor = user?.role === "doctor";

  async function handleChoose() {
    if (!selectedId) return toast.error("Please pick a location");
    setSubmitting(true);
    try {
      await chooseLocation({ referralId: typedId, locationId: selectedId });
      toast.success("Location confirmed!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to choose location");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatus(newStatus: "accepted" | "in_progress" | "completed") {
    setSubmitting(true);
    try {
      await updateStatus({ referralId: typedId, newStatus });
      toast.success(`Referral marked ${newStatus.replace("_", " ")}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return toast.error("Please provide a reason");
    setSubmitting(true);
    try {
      await updateStatus({ referralId: typedId, newStatus: "rejected", reason: rejectReason.trim() });
      toast.success("Referral rejected");
      setRejecting(false);
      setRejectReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setSubmitting(false);
    }
  }

  const canChooseLocation = isPatient && referral.status === "issued";
  const canAccept = isPatient && referral.status === "pending";
  const canStart = isPatient && referral.status === "accepted";
  const canComplete = isPatient && referral.status === "in_progress";
  const canReject = (isPatient || isDoctor) && ["issued", "pending", "accepted", "in_progress"].includes(referral.status);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <button
        onClick={() => router.back()}
        className="mb-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
      >
        &larr; Back to referrals
      </button>

      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold capitalize text-slate-900">{referral.type} Referral</h1>
            <p className="mt-1 text-sm text-slate-500">
              Issued {new Date(referral.issuedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[referral.status]}`}>
              {referral.status.replace("_", " ")}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${URGENCY_STYLES[referral.urgencyLevel]}`}>
              {referral.urgencyLevel}
            </span>
          </div>
        </div>
        <DetailsView type={referral.type} details={referral.details} />
        {referral.notes && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase text-slate-400">Doctor notes</p>
            <p className="mt-1 text-sm text-slate-700">{referral.notes}</p>
          </div>
        )}
      </Card>

      {/* Patient-facing notification card */}
      {referral.location && isPatient && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Your Assigned Location</h2>
          <div className="mt-3 space-y-1 text-sm">
            <p className="font-medium text-slate-900">{referral.location.name}</p>
            <p className="text-slate-600">{referral.location.address}</p>
            <p className="text-slate-600">{referral.location.operatingHours}</p>
            {referral.location.contactInfo.phone && (
              <p className="text-slate-600">{referral.location.contactInfo.phone}</p>
            )}
          </div>
          <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
            <p className="font-semibold">Instructions</p>
            <p className="mt-1">{getInstructions(referral.type)}</p>
          </div>
        </Card>
      )}

      {/* Patient picks location */}
      {canChooseLocation && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Choose a location</h2>
          <p className="mt-1 text-sm text-slate-500">
            We've found the 3 closest partners. Tap a pin on the map or a card below to pick.
          </p>

          {suggestions && suggestions.length > 0 && user?.latitude && user?.longitude ? (
            <>
              <div className="mt-4">
                <PartnersMap
                  patientLat={user.latitude}
                  patientLng={user.longitude}
                  partners={suggestions}
                  selectedId={selectedId}
                  onSelect={(id) => setSelectedId(id as Id<"partnerLocations">)}
                />
              </div>

              <div className="mt-4 space-y-2">
                {suggestions.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => setSelectedId(p._id)}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      selectedId === p._id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-medium text-slate-900">{p.name}</p>
                    <p className="text-sm text-slate-600">{p.address}</p>
                    <p className="text-xs text-emerald-700">{p.distanceKm.toFixed(2)} km away</p>
                  </button>
                ))}
              </div>

              <Button onClick={handleChoose} disabled={!selectedId || submitting} className="mt-4">
                {submitting ? "Confirming..." : "Confirm Location"}
              </Button>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No partner locations available for this referral type.
            </p>
          )}
        </Card>
      )}

      {/* Status progression (demo — simulates partner actions) */}
      {(canAccept || canStart || canComplete) && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Update Status</h2>
          <p className="mt-1 text-xs text-slate-500">
            Demo: simulating partner actions. In production, the partner's system would trigger these.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {canAccept && <Button onClick={() => handleStatus("accepted")} disabled={submitting}>Mark Accepted</Button>}
            {canStart && <Button onClick={() => handleStatus("in_progress")} disabled={submitting}>Mark In Progress</Button>}
            {canComplete && <Button onClick={() => handleStatus("completed")} disabled={submitting}>Mark Completed</Button>}
          </div>
        </Card>
      )}

      {/* Reject */}
      {canReject && (
        <Card>
          {!rejecting ? (
            <Button variant="danger" onClick={() => setRejecting(true)}>Reject Referral</Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-900">Please provide a reason</p>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g. Patient chose to go elsewhere"
              />
              <div className="flex gap-2">
                <Button variant="danger" onClick={handleReject} disabled={submitting}>
                  {submitting ? "Rejecting..." : "Confirm Reject"}
                </Button>
                <Button variant="secondary" onClick={() => setRejecting(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Partner view (demo) */}
      <Card>
        <button
          onClick={() => setShowPartnerView((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Partner Notification View</h2>
            <p className="mt-1 text-xs text-slate-500">
              Demo: shows what the assigned partner would see in their system.
            </p>
          </div>
          <span className="text-sm text-emerald-600">{showPartnerView ? "Hide" : "Show"}</span>
        </button>

        {showPartnerView && partnerView && (
          <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Patient</p>
              <p className="text-slate-900">{partnerView.patient.name ?? "—"}</p>
              {partnerView.patient.phone && <p className="text-slate-600">{partnerView.patient.phone}</p>}
              {partnerView.patient.address && <p className="text-slate-600">{partnerView.patient.address}</p>}
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Referring doctor</p>
              <p className="text-slate-900">
                {partnerView.doctor.name}
                {partnerView.doctor.specialization ? ` — ${partnerView.doctor.specialization}` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Urgency</p>
              <p className="capitalize text-slate-900">{partnerView.urgencyLevel}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Referral type</p>
              <p className="capitalize text-slate-900">{partnerView.type}</p>
            </div>
            <DetailsView type={partnerView.type} details={partnerView.details} />
            {partnerView.doctorNotes && (
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Doctor notes</p>
                <p className="text-slate-700">{partnerView.doctorNotes}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* History */}
      {referral.history.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Status History</h2>
          <ol className="mt-3 space-y-2">
            {referral.history.map((h) => (
              <li key={h._id} className="flex items-start gap-3 text-sm">
                <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-slate-900">
                    {h.fromStatus ? (
                      <>
                        <span className="capitalize">{h.fromStatus.replace("_", " ")}</span>
                        {" → "}
                      </>
                    ) : null}
                    <span className="font-medium capitalize">{h.toStatus.replace("_", " ")}</span>
                  </p>
                  <p className="text-xs text-slate-500">{new Date(h.changedAt).toLocaleString()}</p>
                  {h.reason && <p className="mt-1 text-xs text-slate-600">Reason: {h.reason}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}

function DetailsView({ type, details }: { type: string; details: Record<string, unknown> }) {
  if (type === "pharmacy" && Array.isArray(details.items) && details.items.length > 0) {
    return (
      <div className="mt-4">
        <p className="text-xs font-medium uppercase text-slate-400">Prescriptions</p>
        <ul className="mt-1 space-y-1 text-sm text-slate-700">
          {(details.items as Array<{ name: string; dosage?: string; duration?: string }>).map((item, i) => (
            <li key={i}>
              {item.name}
              {item.dosage ? ` — ${item.dosage}` : ""}
              {item.duration ? ` (${item.duration})` : ""}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (type === "lab" && Array.isArray(details.tests) && details.tests.length > 0) {
    return (
      <div className="mt-4">
        <p className="text-xs font-medium uppercase text-slate-400">Tests</p>
        <ul className="mt-1 space-y-1 text-sm text-slate-700">
          {(details.tests as string[]).map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </div>
    );
  }

  if (type === "imaging") {
    return (
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        {details.imagingType ? (
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Type</p>
            <p className="text-slate-700">{details.imagingType as string}</p>
          </div>
        ) : null}
        {details.bodyRegion ? (
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Body region</p>
            <p className="text-slate-700">{details.bodyRegion as string}</p>
          </div>
        ) : null}
      </div>
    );
  }

  if (type === "specialist") {
    return (
      <div className="mt-4 space-y-2 text-sm">
        {details.referralSpecialty ? (
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Specialty</p>
            <p className="text-slate-700">{details.referralSpecialty as string}</p>
          </div>
        ) : null}
        {details.referralReason ? (
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Reason</p>
            <p className="text-slate-700">{details.referralReason as string}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}

function getInstructions(type: string): string {
  switch (type) {
    case "pharmacy":
      return "Bring your ID and this referral. The pharmacy will prepare your prescription(s).";
    case "lab":
      return "Fasting may be required for certain tests. Bring your ID and this referral.";
    case "imaging":
      return "Arrive 15 minutes early. Avoid metal objects. Bring your ID and this referral.";
    case "specialist":
      return "Call the clinic to schedule your appointment. Bring your ID and this referral.";
    default:
      return "Bring your ID and this referral when you visit.";
  }
}
