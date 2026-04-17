# Appointment Booking & Referral System

A full-stack healthcare booking platform with two roles — **Doctor** and **Patient** — featuring structured health intake, AI-powered triage, and a doctor-initiated referral engine with geo-routing to partner pharmacies, labs, and clinics. Built with Next.js, Convex, and TypeScript.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Backend:** Convex (real-time database, serverless functions, file storage, scheduler)
- **Auth:** @convex-dev/auth with password-based authentication
- **UI:** Tailwind CSS utility classes, Sonner for toasts, Leaflet + OpenStreetMap for maps
- **OCR:** Tesseract.js (images) + pdf.js (digital PDFs) with Tesseract fallback for scanned PDFs
- **AI:** Google Gemini (structured JSON output via `responseSchema`)
- **Language:** TypeScript end-to-end

## Getting Started

### Prerequisites

- Node.js 18+
- Convex account (free at [convex.dev](https://convex.dev))
- Gemini API key (free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey))

### Installation

```bash
git clone https://github.com/JustiHysi/appointment-booking.git
cd appointment-booking
npm install
```

### Configure Convex

```bash
npx convex dev --once
```

This logs you in, creates a project, generates the `convex/_generated/` types, and writes `.env.local` with your deployment URL.

### Configure Authentication

```bash
npx @convex-dev/auth --web-server-url http://localhost:3000
```

Sets `SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS` on your Convex deployment.

### Configure Gemini (for AI intake analysis)

```bash
npx convex env set GEMINI_API_KEY your-key-here
```

### Seed partner locations

```bash
npx convex run partnerLocations:seed
```

Inserts 15 Tirana-area partner locations (pharmacies, Intermedica labs, imaging centers, clinics) for geo-routing demos.

### Run Development Servers

```bash
# Terminal 1 — Convex backend (watches for changes)
npx convex dev

# Terminal 2 — Next.js frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
├── convex/                         # Backend (Convex functions & schema)
│   ├── schema.ts                   # 8 tables: users, doctorProfiles, availabilitySlots,
│   │                               # appointments, healthIntake, referrals,
│   │                               # partnerLocations, referralStatusHistory
│   ├── auth.ts / auth.config.ts / http.ts   # Convex Auth setup
│   ├── helpers.ts                  # requireAuth, requireRole utilities
│   ├── users.ts                    # getCurrentUser, updatePatientProfile
│   ├── doctors.ts                  # Doctor profile CRUD + image upload + paginated search
│   ├── availability.ts             # Slot management (paginated)
│   ├── appointments.ts             # Booking, status updates, stats, pagination
│   ├── intake.ts                   # Health intake CRUD + OCR/AI result persistence
│   ├── ai.ts                       # Gemini structured-output action (medical triage)
│   ├── partnerLocations.ts         # Haversine geo-routing + seed data
│   └── referrals.ts                # Referral engine, state machine, 72h auto-expire
├── src/
│   ├── proxy.ts                    # Server-side auth middleware (Next.js 16)
│   ├── components/
│   │   ├── ui/                     # Shared primitives (Button, Card, Input, ProgressBar)
│   │   └── map/                    # Leaflet components (LocationPicker, PartnersMap)
│   ├── lib/utils.ts                # groupByDate, STATUS_STYLES
│   └── app/
│       ├── layout.tsx              # Root providers (Convex, Toaster)
│       ├── page.tsx                # Landing (sign-in/sign-up)
│       └── dashboard/
│           ├── layout.tsx          # Auth guard + role-aware sidebar + onboarding redirects
│           ├── page.tsx            # Role-based dashboard
│           ├── intake/             # Multi-step patient intake wizard
│           ├── doctors/            # Patient: browse + book
│           ├── availability/       # Doctor: manage slots
│           ├── appointments/       # Both roles + "Create Referral" modal (doctor)
│           ├── profile/            # Role-split: doctor profile / patient address+map
│           └── referrals/          # List + detail page with map + state machine
└── public/
    ├── hero.webp                   # Landing page hero
    └── pdf.worker.min.mjs          # pdf.js worker (local, no CDN)
```

## Features

### Core (Phase 1)

- Password-based sign-up with role selection (doctor/patient)
- Doctor profile with image upload
- Availability slot management
- Appointment booking with slot conflict prevention (transactional)
- Appointment status lifecycle (pending → confirmed/rejected → completed, or cancelled)
- Doctor notes on confirmed appointments
- Paginated lists with `usePaginatedQuery` throughout

### Patient Intake Flow (Phase 2)

- 4-step wizard: Specialty → Health Form → Documents → Review
- Health form: chief complaint, symptom duration dropdown, 1-10 pain slider, medications, allergies, condition checkboxes
- Document upload to Convex file storage (images + PDFs)
- **OCR**: Tesseract.js for images; pdf.js text layer for digital PDFs; fallback to canvas render + Tesseract for scanned PDFs
- **AI triage**: Google Gemini with `responseSchema` enforced structured output. Returns suggested specialty, urgency level, clinical summary, possible conditions, recommended tests, and flags
- Review summary with AI insights; patient can edit before booking
- Doctor filtered by AI-suggested specialty
- Appointment bidirectionally linked to intake record

### Referral Engine (Phase 2)

- Doctor creates referrals on confirmed/completed appointments
- Four types: Pharmacy (meds + dosage + duration), Lab (tests), Imaging (type + body region), Specialist (specialty + reason)
- Urgency levels: Routine / Urgent / Emergency
- **Geo-routing**: Haversine formula finds 3 closest partner locations of the correct type using the patient's registered coordinates
- Interactive Leaflet map: patient sees suggestions with distances, taps to pick one
- **State machine**: `issued → pending → accepted → in_progress → completed` (plus `rejected` with reason, `expired` after 72h)
- **Auto-expiry**: Convex scheduler runs 72h after creation; expires only if still issued/pending
- **Status history** audit log (who changed what, when, why)
- **Patient notification payload**: assigned location, address, hours, instructions
- **Partner notification payload** (via `getPartnerView`): patient name, phone, referral details, urgency, doctor notes — demonstrable in the UI

### Patient Address Profile (Phase 2)

- Interactive Leaflet + OpenStreetMap picker
- "Use my current location" button (browser geolocation)
- Reverse geocoding via OpenStreetMap Nominatim (free, no API key)
- Onboarding redirect: patient cannot access app features until they save an address
- In-app warning banner explains why

### Bonus Features

- Pagination on appointments, availability, doctors, and referrals
- Profile image upload via Convex file storage
- Doctor onboarding (auto-redirect if no profile)
- Search/filter doctors by name or specialization
- Responsive design with collapsible mobile sidebar
- Real-time updates on every page (Convex reactive queries)

## Design Decisions

### Schema Design

- **Single `users` table** with `role` field — auth tables live alongside app tables, overriding the `users` definition from `authTables` to add `role`, `address`, `latitude`, `longitude`
- **Every queryable field is indexed** — no `.filter()` calls anywhere; compound indexes (`by_doctorId_and_date`) where needed
- **Denormalized timestamps** on appointments for display without joins
- **Separate status history table** — audit log for referrals is a separate table, never mutated, only appended
- **`healthIntake.aiAnalysis`** is a Convex validator (`v.object({...})`) that exactly mirrors the AI response schema — compile-time + runtime type guarantee

### Backend Architecture

- **Auth helpers** (`requireAuth`, `requireRole`) in `convex/helpers.ts` — eliminates 15+ repetitions of the same pattern
- **Convex actions** (`ai.ts`) for external API calls (Gemini), separated from mutations/queries which run in Convex's V8 runtime
- **Scheduled functions** for the 72h referral auto-expiry — no cron server needed, built into Convex
- **Transactional booking**: slot check → mark booked → insert appointment, all atomic
- **Double-booking prevention** via the `isBooked` flag on the slot (checked inside the mutation transaction)

### AI Integration

- **Structured output enforced** at the SDK level via Gemini `responseSchema` — the model cannot return free text or malformed JSON
- **Prompt engineering**: role-specific persona ("medical triage assistant at a hospital intake desk"), explicit per-field instructions, markdown-formatted inputs, enumerated valid outputs
- **Graceful degradation**: if AI call fails, user can still proceed manually — analysis is optional

### Geo-Routing

- **Haversine formula** in a pure function inside `partnerLocations.ts` — deterministic, no external API
- **Type mapping layer** — referral types (`pharmacy | lab | imaging | specialist`) map to partner types (`pharmacy | lab | imaging_center | clinic`), centralized in `referrals.ts`
- **Patient address required** — onboarding redirect ensures every patient has lat/lng before they can access referral features

### Frontend Architecture

- **All dashboard pages are client components** (Convex reactive hooks require client)
- **Server-side proxy.ts** redirects unauthenticated requests before page render (no content flash)
- **Role-aware navigation**: sidebar renders different links for doctor vs patient
- **Reusable UI primitives** (`Button`, `Card`, `Input`, `ProgressBar`) used 5+ times across pages
- **Route co-location**: page-specific helpers live inside the same `page.tsx` as small functions (avoids premature abstraction); genuinely shared logic goes in `components/`
- **Leaflet dynamic import** with `ssr: false` — Leaflet needs `window`, so we skip SSR for map components

### UI/UX

- **Slate + emerald palette** — dark sidebar, emerald accents, white cards with subtle shadows
- **Multi-step wizards** with visible progress bar
- **Loading skeletons** on every page (not just spinners)
- **Toast notifications** on every mutation (success + error)
- **Form validation** with clear error messages
- **Responsive**: landing page splits to two columns on desktop; dashboard sidebar collapses into hamburger on mobile

## Status State Machine

```
                       ┌─→ rejected (with reason)
  issued ─→ pending ──┴─→ accepted ──→ in_progress ──→ completed
     │         │
     └─────────┴──→ expired (auto, 72h without acceptance)
```

Transitions are enforced in `updateStatus`; invalid transitions throw. Every transition logs to `referralStatusHistory`.

## Testing the Full Flow

1. **Sign up** two accounts: one doctor, one patient
2. **Doctor** creates a profile (auto-redirect if missing)
3. **Doctor** adds availability slots
4. **Patient** saves address via map picker (auto-redirect if missing)
5. **Patient** starts "Book Appointment" → completes 4-step intake → AI analysis appears → picks doctor filtered by AI-suggested specialty → books a slot
6. **Doctor** sees pending appointment → confirms → clicks "Create Referral" → picks type (e.g. lab + tests) → urgency → notes → submit
7. **Patient** sees the referral in sidebar → opens it → map shows 3 closest Intermedica branches → picks one
8. **Patient** advances status (demo: simulating partner): Accept → In Progress → Complete
9. Check the **"Partner Notification View"** toggle on the referral page to see the exact payload a real partner would receive
10. Check the **status history** — every transition logged with timestamps

## What I'd Improve Given More Time

- **Partner accounts**: separate `partner` role with login, dashboard, and notification preferences — so partners actually interact with the referral system
- **Real notifications**: email/SMS via Resend or Twilio when a referral is issued, accepted, or expires
- **Calendar view** for slot management and booking
- **Appointment rescheduling** without cancelling
- **Doctor availability templates** (recurring weekly schedules)
- **Results upload** from labs/imaging centers back to the referring doctor
- **Geocoding of typed addresses** (so typing an address auto-pins the map, not just the other way around)
- **Rate limiting** on mutations (especially AI calls)
- **Appointment/referral export** as CSV/PDF
- **Dark mode** (the color system is already consistent enough to toggle)
- **Tests**: Vitest + convex-test for backend; Playwright for end-to-end flows

## Deployment

### Vercel (Frontend)

Push to GitHub, connect to Vercel. Environment variables needed:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Your Convex deployment URL |

### Convex (Backend)

```bash
npx convex deploy
```

Set production environment variables:

| Name | Value |
|---|---|
| `SITE_URL` | Production URL (e.g. `https://your-app.vercel.app`) |
| `JWKS` + `JWT_PRIVATE_KEY` | Generated by `npx @convex-dev/auth` |
| `GEMINI_API_KEY` | Your Gemini key |
