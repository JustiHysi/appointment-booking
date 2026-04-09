# Appointment Booking System

A full-stack appointment booking application with two user roles — **Doctor** and **Patient** — built with Next.js, Convex, and TypeScript.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Backend:** Convex (real-time database, serverless functions)
- **Auth:** @convex-dev/auth with password-based authentication
- **UI:** Tailwind CSS utility classes, Sonner for toast notifications
- **Language:** TypeScript end-to-end (no `any` types)

## Getting Started

### Prerequisites

- Node.js 18+
- A Convex account (free at [convex.dev](https://convex.dev))

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

This will prompt you to log in and create a project. It generates the `convex/_generated/` types and creates `.env.local` with your deployment URL.

### Configure Authentication

```bash
npx @convex-dev/auth --web-server-url http://localhost:3000
```

This sets `SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS` on your Convex deployment automatically.

### Run Development Servers

```bash
# Terminal 1 — Convex backend (watches for changes)
npx convex dev

# Terminal 2 — Next.js frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── convex/                    # Backend (Convex functions & schema)
│   ├── schema.ts              # Database schema (4 tables + auth tables)
│   ├── auth.ts                # Password auth provider config
│   ├── auth.config.ts         # JWT configuration
│   ├── http.ts                # HTTP routes for auth
│   ├── users.ts               # getCurrentUser query
│   ├── doctors.ts             # Doctor profile CRUD, image upload, search
│   ├── availability.ts        # Availability slot management
│   └── appointments.ts        # Booking, status updates, pagination
├── src/
│   ├── proxy.ts               # Auth middleware (Next.js 16 proxy)
│   └── app/
│       ├── layout.tsx          # Root layout with providers
│       ├── ConvexClientProvider.tsx  # Convex + auth provider wrapper
│       ├── page.tsx            # Landing page (sign-in/sign-up)
│       └── dashboard/
│           ├── layout.tsx      # Auth guard, sidebar, mobile menu
│           ├── page.tsx        # Role-based dashboard with stats
│           ├── doctors/        # Patient: browse & book doctors
│           ├── availability/   # Doctor: manage time slots
│           ├── appointments/   # Both: view & manage appointments
│           └── profile/        # Doctor: create/edit profile
└── public/
    └── hero.webp              # Landing page hero image
```

## Design Decisions

### Schema Design

- **Single `users` table** with a `role` field (`"doctor" | "patient"`) rather than separate tables. Extends Convex Auth's built-in user fields while adding the custom role.
- **Foreign keys use `v.id("users")`** for doctor references (not `v.id("doctorProfiles")`), since doctors are users first. The `doctorProfiles` table is supplementary data.
- **Denormalized `date`, `startTime`, `endTime` on appointments** — avoids joins when displaying appointment details. The slot reference (`slotId`) maintains the canonical link.
- **All queryable fields are indexed** — `withIndex()` is used everywhere, never `filter()`. Compound index `by_doctorId_and_date` enables efficient date-specific slot queries.

### Backend Logic

- **Every public function** validates args, checks authentication via `getAuthUserId(ctx)`, and enforces role-based access.
- **Transactional booking** — Convex mutations are atomic, so the slot check + mark booked + create appointment happens in a single transaction. No double-booking possible.
- **Slot freed on cancel/reject** — when an appointment is cancelled or rejected, the slot's `isBooked` flag is reset so it becomes available again.
- **Pagination** on appointments using Convex's `paginationOptsValidator` + `.paginate()` for scalable lists.

### Frontend Architecture

- **All dashboard pages are client components** (they use Convex reactive hooks). The root layout remains a server component.
- **Auth guard in dashboard layout** — checks `useConvexAuth()` once; child pages don't re-check.
- **Server-side auth via `proxy.ts`** (Next.js 16 middleware) — unauthenticated requests to `/dashboard/*` are redirected before the page loads. No content flash.
- **Doctor onboarding flow** — doctors without a profile are automatically redirected to `/dashboard/profile`.
- **Real-time updates** — all data fetching uses `useQuery()` / `usePaginatedQuery()`, so changes from other tabs or users appear instantly.

### UI/UX

- **Slate + emerald color palette** — dark sidebar (slate-900), emerald accents, clean white cards with subtle shadows.
- **Responsive design** — landing page splits into two columns on desktop, stacks on mobile. Dashboard sidebar collapses into a hamburger menu on small screens.
- **Loading skeletons** on every page (not just spinners) for better perceived performance.
- **Toast notifications** (Sonner) for all mutation feedback — success and error.
- **Form validation** — required fields, password min length, time range validation, file size/type checks on image upload.

## Features

### Core

- Password-based sign-up/sign-in with role selection
- Doctor profile creation and editing with image upload
- Availability slot management (add/remove)
- Appointment booking with optional reason
- Appointment status management (confirm/reject/complete/cancel)
- Doctor notes on confirmed appointments
- Role-based navigation and access control

### Bonus

- Pagination with `usePaginatedQuery` and "Load More" button
- Profile image upload via Convex file storage
- Doctor onboarding flow (auto-redirect if no profile)
- Search/filter doctors by name or specialization
- Responsive mobile design with collapsible sidebar

## What I'd Improve Given More Time

- **Email notifications** — send confirmation/reminder emails using Convex actions + a transactional email service (Resend, SendGrid).
- **Calendar view** — replace the date-grouped slot list with a proper calendar component (e.g., react-day-picker) for both availability management and booking.
- **Appointment rescheduling** — allow patients to move an appointment to a different slot without cancelling and rebooking.
- **Doctor availability templates** — let doctors set recurring weekly schedules instead of adding individual slots.
- **Rate limiting** — add rate limits on booking mutations to prevent abuse.
- **Appointment history export** — allow users to download their appointment history as CSV/PDF.
- **Dark mode** — the color system is already consistent enough to add a dark theme toggle with minimal effort.

