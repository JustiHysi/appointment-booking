"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";

const STATUS_STYLES: Record<string, string> = {
  issued: "bg-yellow-100 text-yellow-700",
  pending: "bg-blue-100 text-blue-700",
  accepted: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  completed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-slate-100 text-slate-500",
};

const TYPE_LABELS: Record<string, string> = {
  pharmacy: "Pharmacy",
  lab: "Lab",
  imaging: "Imaging",
  specialist: "Specialist",
};

const URGENCY_STYLES: Record<string, string> = {
  routine: "text-slate-600",
  urgent: "text-yellow-700 font-semibold",
  emergency: "text-red-700 font-semibold",
};

export default function ReferralsPage() {
  const user = useQuery(api.users.getCurrentUser);
  const { results, status, loadMore } = usePaginatedQuery(
    api.referrals.getMyReferrals,
    {},
    { initialNumItems: 10 },
  );

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">
        {isDoctor ? "Issued Referrals" : "My Referrals"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {isDoctor
          ? "Referrals you've issued to patients"
          : "Referrals your doctors have issued for you"}
      </p>

      {results.length === 0 ? (
        <p className="mt-8 text-center text-slate-500">No referrals yet.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {results.map((r) => (
            <Link key={r._id} href={`/dashboard/referrals/${r._id}`}>
              <Card className="!p-5 transition-shadow hover:shadow-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {TYPE_LABELS[r.type]}
                      </span>
                      <span className={`text-xs ${URGENCY_STYLES[r.urgencyLevel]}`}>
                        {r.urgencyLevel.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Issued {new Date(r.issuedAt).toLocaleDateString()}
                    </p>
                    {r.notes && (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{r.notes}</p>
                    )}
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                    {r.status.replace("_", " ")}
                  </span>
                </div>
              </Card>
            </Link>
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
