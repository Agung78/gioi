# GIOI Bali — Reservation Platform Prototype

A clickable, frontend-only prototype of the GIOI Bali direct reservation platform.

This is the **first-release scope** from
[`docs/gioi_client_scope_and_delivery.md`](../docs/gioi_client_scope_and_delivery.md)
and [`docs/gioi_reservation_platform_design.md`](../docs/gioi_reservation_platform_design.md):

- Public landing page → reservation flow (no allergy data exposed on public pages).
- Direct booking with live availability rules.
- Host day view with status transitions, walk-ins, guest search.
- Guest profile with visit history and alerts.
- Manager dashboard with the five scope §9 panels and action cues.
- Super Admin settings (rules, seating areas, users, CSV export).
- Audit log for status and settings changes.
- Pinia state persisted to localStorage with a **Reset demo data** button.

Nothing here is real auth, no external APIs, no server. Everything lives in your browser.

---

## Stack

- **Vite + Vue 3** (`<script setup>`)
- **Vue Router** with route guards by role
- **Pinia** for state, persisted to `localStorage`
- **Tailwind CSS** for styling
- **Vitest** for unit tests on the pure domain module
- **Vercel** static deploy with SPA rewrite

---

## Run

```bash
cd gioi/prototype
pnpm install
pnpm dev          # http://127.0.0.1:5173 (or whichever port Vite picks)
pnpm test         # vitest run
pnpm build        # type-check + production build
pnpm preview      # serve the production build locally
```

Node ≥ 20, pnpm ≥ 9.

---

## Demo flow

1. **Public booking** — open `/`, scroll to **Reserve a table**.
   Pick a future date (today's slots may already be in the past depending on your clock),
   a party size, and an available time. The grid disables past, lead-time, cut-off, closed,
   and full slots automatically.
   Fill the contact, occasion, dietary, accessibility, and special-request fields, tick
   the cancellation policy box, submit. You'll land on a confirmation page that shows
   the booking code, date, time, party, and seating area — **never** the allergy or
   accessibility data.
2. **Host day view** — open `/login`, click **Sign in as Putu (Host)**.
   You'll see today's bookings grouped by time slot. Each card shows allergy and
   accessibility alerts when present, plus repeat-guest flags.
   Status buttons enforce the rules from scope §4: Pending → Confirmed → Arrived →
   Seated → Completed, with Cancelled allowed from Pending/Confirmed and No-show
   allowed from Confirmed/Arrived. Use **+ Walk-in** to add a same-day reservation
   (skipping past/lead-time checks).
3. **Guest profile** — click a guest name in the host view or search via the
   **Guest search** tab to find a guest by name, phone, or email. The profile page
   shows allergies, accessibility needs, internal notes, and a chronological
   reservation history with status changes.
4. **Manager dashboard** — sign in as **Made (Super Admin)** and open **Dashboard**.
   Five panels: Today live, Next 7 / 30 days, Guest mix, Channel performance,
   Reliability, with action cues for slots above the capacity threshold, no-show rate
   above target, and allergy repeat guests on today's service.
5. **Settings + audit** — open **Settings** to edit opening hours, booking rules,
   seating areas, and users. Every change is logged in **Audit** with the actor,
   timestamp, and changed fields.

---

## Project structure

```
prototype/
├── scripts/generate-seed.mjs   # regenerates src/mock/*.json deterministically
├── src/
│   ├── domain/                 # PURE module: types, dates, availability, status, analytics
│   │   └── __tests__/          # vitest coverage for every pure function
│   ├── mock/                   # generated JSON seed (guests, reservations, settings, users, audit)
│   ├── stores/                 # Pinia stores: data, auth, reservations, settings, export
│   ├── composables/            # useResetDemo, dateAnchor (shifts seed dates onto browser "today")
│   ├── views/                  # LandingView, BookingView, ConfirmationView, LoginView,
│   │                           # HostView, GuestProfileView, AdminDashboardView,
│   │                           # AdminSettingsView, AdminAuditView
│   ├── components/             # AvailabilityGrid, StatusButtons, WalkInModal, GuestSearch,
│   │                           # BarChart, Sparkline
│   ├── router.ts               # public + role-protected routes
│   ├── main.ts                 # Pinia + Router boot
│   └── App.vue                 # shell with header + reset
├── vercel.json                 # SPA rewrite: /* → /
└── ...
```

The availability logic and status-transition machine live in **one pure module**
(`src/domain/`). Vue and Pinia never leak into it. This is what makes the rules
testable without a browser:

- `availability.ts` — opening hours, intervals, party-size limits, seating-area
  capacity, lead time, cut-off, closed dates, full-slot detection.
- `status.ts` — the state machine. `canTransition(from, to)` and `nextStatuses(from)`
  are the only things the UI uses to decide which buttons to render.
- `analytics.ts` — the five dashboard panels + action cues, computed from settings
  and reservations.

```bash
pnpm test
# → 38 passing tests
```

---

## Seed data

```bash
node scripts/generate-seed.mjs
```

Writes `src/mock/{settings,users,guests,reservations,audit}.json` deterministically:

- 40 guests (~25% with allergies, ~12% with accessibility needs, ~50% with seating
  preferences).
- ~155 reservations across the past 30 days and the next 14 days from a mix of
  channels: website, Instagram, Google, WhatsApp, walk-in, phone, Host.
- Today always has five hand-curated reservations so the host view and action cues
  are demonstrable on first load.

The seed dates are anchored to `2026-09-30`. On hydration in the browser, every
reservation and audit timestamp is shifted by the browser's local offset so the
past-30 / next-14 distribution holds regardless of when the demo is opened.

---

## Deploy to Vercel

```bash
vercel --prod
```

`vercel.json` rewrites every request to `/`, which Vite's `index.html` handles as
an SPA. The whole bundle is static — no server, no functions. Vercel auto-detects
Vite and runs `pnpm build`.

### Lock the demo URL behind a password

Once it's deployed to a real URL, anyone with the link can click through. If the
demo isn't meant to be public:

1. In the Vercel dashboard, open the project → **Settings → Deployment Protection**.
2. Enable **Vercel Authentication** with a password (or SSO).
3. Add the URL to the allowed collaborators list.

Until you do this, **don't share the URL** — it's unauthenticated by design (it's
a clickable prototype, not a production app).

---

## Limits of the prototype

- **Data lives in your browser only.** Each visitor sees their own copy of the
  state. Two browsers side-by-side will see two different guest histories and
  audit logs. There is no shared database.
- **No real authentication.** The login screen is a role picker. Anyone can pick
  Super Admin.
- **No external integrations.** No WhatsApp, no email, no payment provider, no
  Chope sync. Status changes happen in the browser; nothing is sent anywhere.
- **No multi-user or audit reconciliation.** If two browser tabs both change the
  same reservation, the last write wins. The audit log is per-browser.
- **Reservation notifications don't exist.** The confirmation screen is the only
  feedback the guest gets. There is no WhatsApp message, no email.
- **No real import.** The Chope migration flow from the design doc is not
  implemented. Seed data stands in for historical imports.
- **Manager dashboard numbers come from the local store**, so they will differ
  across browsers and from any real production data.
- **Date arithmetic uses the browser's local clock.** "Today" on the host view
  is whatever the browser thinks it is. If your laptop clock is wrong, so are the
  reservations.
- **Allergies and accessibility fields are stored as plain text arrays / free
  text.** This is intentional for a prototype — the production schema will need
  proper structure and validation.

---

## Out of scope (deferred to later phases per the design doc)

- WhatsApp / email notifications (Phase 2)
- Payments / deposits (Phase 2)
- Detailed table-map engine (Phase 2+)
- Cohort / RFM / customer-lifetime-value analytics (Phase 4)
- Loyalty / re-engagement / feedback forms (Phase 4)
- POS / KDS / omnichannel inbox integrations
- Native iOS / Android applications