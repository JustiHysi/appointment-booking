"use client";

import { useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Label, Textarea } from "../../../components/ui/input";

// Leaflet uses window — must be loaded client-only.
const LocationPicker = dynamic(() => import("../../../components/map/location-picker"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-xl bg-slate-200" />,
});

const TIRANA = { lat: 41.3275, lng: 19.8187 };

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
    );
    const data = await res.json();
    return data?.display_name ?? null;
  } catch {
    return null;
  }
}

export default function PatientProfile() {
  const user = useQuery(api.users.getCurrentUser);
  const updateProfile = useMutation(api.users.updatePatientProfile);

  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number>(TIRANA.lat);
  const [longitude, setLongitude] = useState<number>(TIRANA.lng);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [pinSet, setPinSet] = useState(false);

  useEffect(() => {
    if (user) {
      setAddress(user.address ?? "");
      if (user.latitude !== undefined) setLatitude(user.latitude);
      if (user.longitude !== undefined) setLongitude(user.longitude);
      if (user.address) setPinSet(true);
    }
  }, [user]);

  if (!user) return null;

  const hasAddress = !!user.address;

  async function applyCoords(lat: number, lng: number) {
    setLatitude(lat);
    setLongitude(lng);
    setPinSet(true);
    if (!address.trim()) {
      const resolved = await reverseGeocode(lat, lng);
      if (resolved) setAddress(resolved);
    }
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) return toast.error("Geolocation not supported by your browser");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await applyCoords(pos.coords.latitude, pos.coords.longitude);
        toast.success("Location captured!");
        setLocating(false);
      },
      () => {
        toast.error("Unable to get your location");
        setLocating(false);
      },
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pinSet) return toast.error("Please pin your location on the map first");
    if (!address.trim()) return toast.error("Please enter your address");
    setSubmitting(true);
    try {
      await updateProfile({ address: address.trim(), latitude, longitude });
      toast.success(hasAddress ? "Address updated!" : "Address saved!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
      <p className="mt-1 text-sm text-slate-500">
        Set your address — we use it to suggest the closest pharmacies, labs, and clinics for your referrals.
      </p>

      {!hasAddress && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-yellow-50 px-5 py-4 ring-1 ring-yellow-200">
          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-yellow-800">Address required</p>
            <p className="mt-1 text-sm text-yellow-700">
              Please save your address before booking appointments or accessing other features. We use it to find the closest pharmacies, labs, and clinics when doctors issue referrals.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6">
        <Card className="space-y-4">
          <div>
            <Label>Pin your location on the map</Label>
            <p className="mt-1 text-xs text-slate-500">
              Tap anywhere on the map, or use the button below to detect your location automatically.
            </p>

            <div className="mt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleUseMyLocation}
                disabled={locating}
                className="flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {locating ? "Locating..." : "Use my current location"}
              </Button>
            </div>

            <div className="mt-3">
              <LocationPicker
                latitude={latitude}
                longitude={longitude}
                onChange={(lat, lng) => applyCoords(lat, lng)}
              />
            </div>

            {pinSet && (
              <p className="mt-1 text-xs text-slate-400">
                Coordinates: {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </p>
            )}
          </div>

          <div>
            <Label>Address</Label>
            <p className="mt-1 text-xs text-slate-500">
              Auto-filled when you pin the map. You can edit it if needed.
            </p>
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="Rruga e Kavajës 100, Tiranë, Albania"
              className="mt-1.5"
            />
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : hasAddress ? "Update Address" : "Save Address"}
          </Button>
        </Card>
      </form>
    </div>
  );
}
