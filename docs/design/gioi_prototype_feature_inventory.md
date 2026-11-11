# GIOI Prototype Feature Inventory

**Date:** 2026-11-07
**Source:** `prototype/src` at commit `a30eeb9`, read file by file. `pnpm test` → 4 files, 44 tests passing.
**Purpose:** the authoritative list of what the prototype does, for porting in `gioi_execution_strategy.md`. If a feature is not listed here, the prototype does not have it. Section 7 lists what the strategy asks for that has no prototype counterpart. Section 8 lists prototype behaviour that production must not copy.

`prototype/` is frozen: nobody edits it, and its README is not corrected. The gaps and bugs below are recorded so production avoids them, not so they get fixed in the prototype. Where the README and this file disagree, the code is right (§9).

## 1. Routes

| Path | Name | Access | View |
|---|---|---|---|
| `/` | landing | public | `LandingView.vue` |
| `/book` | book | public. Query: `date`, `party`, `time` | `BookingView.vue` |
| `/confirmation/:code` | confirmation | public | `ConfirmationView.vue` |
| `/feedback/:code` | feedback | public | `FeedbackView.vue` |
| `/login` | login | public. Query: `next` | `LoginView.vue` |
| `/host` | host | `SUPER_ADMIN`, `HOST` | `HostView.vue` |
| `/guests/:id` | guest | `SUPER_ADMIN`, `HOST` | `GuestProfileView.vue` |
| `/admin/dashboard` | admin-dashboard | `SUPER_ADMIN` | `AdminDashboardView.vue` |
| `/admin/settings` | admin-settings | `SUPER_ADMIN` | `AdminSettingsView.vue` |
| `/admin/audit` | admin-audit | `SUPER_ADMIN` | `AdminAuditView.vue` |
| `/*` | (catch-all) | redirects to `/` | |

Guard (`router.ts`): unauthenticated → `/login?next=<path>`. Wrong role → HOST goes to `/host`, anyone else to `/login`. Page changes use the View Transitions API when the browser supports it, and every navigation scrolls to the top.

## 2. Public guest features

### 2.1 Landing page (`/`)
- Hero with GSAP word-reveal and parallax animation, turned off under `prefers-reduced-motion`.
- **Quick-book form:** date (`DatePicker`, today to +90 days, closed dates disabled) and party size (settings min–max). Submitting goes to `/book?date=&party=`.
- "Experience" section: three hard-coded scenes (10:00, 17:30, 20:00) with images from `gioigroup.com`.
- "Visit" section: address, Google Maps link, WhatsApp link (`wa.me/<digits>`), `tel:` link, weekly opening hours from settings, and a live clock in Bali time (`Asia/Makassar`, labelled WITA).
- Footer "Staff login" link to `/login`.
- Floating light/dark theme toggle.
- **Copy is hard-coded.** The headline and intro do not read `restaurant.tagline` or `restaurant.intro`. Only the address, phone, WhatsApp, maps URL and opening hours come from settings.
- No SEO meta, no JSON-LD. It is a client-rendered SPA.

### 2.2 Booking flow (`/book`)
One page in three sections, with a sticky summary card on desktop and a fixed bottom bar on mobile.
1. **When**
   - Date strip of the next 14 days. Closed days are disabled. "More dates" opens the `DatePicker` with no upper limit.
   - Party stepper limited to `partySizeLimits`. At the maximum it shows "Groups over N? Message us on WhatsApp".
   - Seating choice ("Anywhere" or one bookable area), shown only when more than one area is bookable.
   - Time grid (`AvailabilityGrid`) grouped into Lunch (<14:00), Afternoon (14–17), Sunset (17–19, hint "Sun goes down around 18:15") and Dinner (≥19:00). Unavailable slots show "Closed", "Full" or "Too soon". Open slots with ≤2 covers left show "N left".
   - Changing the date or party size clears the selected time.
2. **Who:** full name (required), WhatsApp/phone (required, no format check), email (optional), country/city (optional).
3. **Details (optional, collapsible, shows an "N added" badge):**
   - Occasion pills: Birthday, Anniversary, Business dinner, Date night, Celebration.
   - Dietary pills: Vegetarian, Vegan, Halal, Gluten-free, Nut allergy, Shellfish allergy, plus a free-text comma-separated field. Both are merged into `guest.allergies`.
   - Accessibility needs (free text) → `guest.accessibility`.
   - Special requests, max 300 characters with a counter → `reservation.guestNotes`.
- The cancellation policy text comes from settings. Its checkbox is required.
- Marketing consent checkbox, optional. Sets `marketingConsent` and `marketingConsentAt` **only when a new guest is created** (§4.2).
- The submit button stays disabled until a time, name, phone and policy acceptance are present and `checkAvailability` passes. A prompt names the missing step.
- On submit the availability check runs again. If it fails: "That time just filled up", the time is cleared and the page scrolls to the slots.
- On success: `reservations.create(... source: 'website', status 'pending')` → `/confirmation/:code`.
- No Turnstile, no idempotency key, no rate limit.

### 2.3 Confirmation (`/confirmation/:code`)
- Looks up the booking by code in the local store. Unknown code shows "We couldn't find that booking code".
- Shows the booking code with a Copy button (clipboard), date, time, party, seating area name, **`guestNotes` when present**, and a status chip.
- **Add to calendar:** `.ics` data URI with a fixed 90-minute duration, floating local time, UID `<code>@gioi`.
- Get directions (maps URL) and Message us (WhatsApp).
- Does not show allergies, accessibility, phone or internal notes.
- **No guest cancel or modify action.**

### 2.4 Feedback (`/feedback/:code`)
- Available only when the reservation exists and its status is `completed`. Otherwise it shows "Feedback unavailable".
- Title, subtitle and tag options come from settings, with fallbacks: "How was your visit?" and Food / Service / Atmosphere / Value.
- 1–5 star rating (required), multi-select "What stood out?" tags, comments (optional, max 1000).
- Submit pushes a `FeedbackResponse` and appends audit `feedback.submitted` (actor = guest name).
- **One-per-reservation is not enforced.** Reloading the link allows another submission.
- Feedback never touches marketing consent.

## 3. Staff features

### 3.1 Login (`/login`)
- **Role picker, no credentials.** Two buttons: Super Admin and Host.
- `auth.loginAs(role)` picks the **first active user with that role** and updates its `lastLoginAt`. The session is `{ userId }` in `localStorage` (`gioi.auth.v1`).
- Redirects to `next`, otherwise `/admin/dashboard` (admin) or `/host` (host).
- Button copy says "Sign in as Made" but the seed's first SUPER_ADMIN is Yodha Kautsar (`u-admin`), so that is who signs in.

### 3.2 App shell (`App.vue`, staff routes only)
- Logo, nav (Host only for HOST; Host / Dashboard / Settings / Audit for SUPER_ADMIN), mobile nav strip.
- Theme toggle, **Reset demo data** (clears storage, re-seeds, reloads), user chip "name · ROLE", Sign out.

### 3.3 Host day view (`/host`)
- Date navigation: Previous / Today / native date input / Next. Header shows the booking count and the active count (pending, confirmed, arrived or seated).
- Tabs: **Today's service** | **Guest search**.
- Service list grouped by time slot. Each group shows its booking count and covers, excluding cancelled and no-show.
- Each reservation card shows:
  - Guest name (links to the profile), a **Repeat** chip when the guest has more than one visit (arrived, seated or completed).
  - Party, area name, booking code, source, occasion.
  - Status chip.
  - Alerts: **Allergies** (danger), **Accessibility** (warn), guest note, internal note.
  - `StatusButtons`: one primary forward action, plus destructive actions (Cancelled, No-show) behind an inline confirm ("Mark as X? Yes / Keep booking").
  - When completed: **Send feedback via WhatsApp**. Opens `wa.me/<guest digits>?text=<template>` with the URL `<origin>/feedback/<code>` and appends audit `feedback_link.sent`. Errors when the guest has no phone digits.
- Status errors show in a banner.
- **No reservation editing in the UI.** `reservations.update()` exists in the store (date, time, party, area, occasion, guestNotes, internalNotes, audited as `reservation.updated`), but no view calls it. Internal notes cannot be entered anywhere.
- No polling and no live refresh. State is local to the browser.

### 3.4 Walk-in modal (`WalkInModal.vue`)
- Fields: name and phone (required), party (1–20 input, still checked against settings limits), time (default 19:00), seating area (bookable only), source (walk_in, phone, whatsapp, instagram, google), occasion, allergies (comma-separated), notes. **No email field is rendered** although the code reads one.
- **Date is always today**, whatever date the host view is showing. Future phone bookings by staff are not possible.
- Uses `checkAvailability(..., { skipTemporal: true })`, which skips the past, lead-time and cut-off checks. **The capacity, opening-hours, closed-date and party-limit checks still apply. There is no override.** Blocking reasons are shown raw (for example `full, outside_hours`).
- Creates the reservation as `pending` then immediately calls `changeStatus → confirmed`. That writes two audit events.
- Walk-in guests always get `marketingConsent: false`.

### 3.5 Guest search (`GuestSearch.vue`)
- Case-insensitive substring match on name, phone or email after 2 characters. At most 8 results.
- Each row shows the visit count and chips for allergy (with values), accessibility and repeat. Clicking opens the profile.

### 3.6 Guest profile (`/guests/:id`)
- **Read-only.** Name, phone, email, country, "Guest since", marketing consent yes/no.
- Counters: visits (arrived, seated or completed), cancelled, no-show.
- Cards: allergies, accessibility, seating preference, internal notes (`guest.notes`). None can be edited.
- Visit history, newest first: date, time, party, area, source, code, occasion, status chip. The guest's feedback (rating, comments, tags) appears inline. A collapsible **status history** lists time, from → to and actor.
- No edit, no delete or anonymise, no export.

## 4. Admin features (SUPER_ADMIN)

### 4.1 Manager dashboard (`/admin/dashboard`)
- **Filters:** range preset (Today, Last 7, Last 30 (the default, which is 31 days inclusive), Custom from/to), status, source, area, occasion.
  - Range, source, area and occasion filter the period panels and the table. **Status filters only the table.** Today, Next 7 and Next 30 ignore all filters.
- **Action cues** (`actionCues`), each with a deep link:
  - `slot_over_capacity`: for today, per date + time + area, booked covers ≥ `overCapacityAlertPercent` of the area's capacity. ≥100% is danger. Links to `/host`.
  - `no_show_rate_high`: no-show rate over the last 30 days is above `noShowTargetPercent` and at least 10 reservations are realised.
  - `allergy_repeat_today`: a guest with allergies who has a non-cancelled, non-no-show reservation today and more than one such reservation in total. Links to the guest.
  - `cancellation_rate_high` has a label but **is never generated**.
- **Today live:** bookings, expected covers (pending through completed), arrived, seated, completed, no-shows / cancellations, and capacity fill % against the sum of bookable area capacities.
- **Next 7 days:** covers per day (bar chart with fill %) and the busiest slot.
- **Next 30 days:** sparkline, total, average per day, peak day, and a day grid with tooltips.
- **Guest mix (period):** total guests (all time, ignores filters), first-timers vs repeats (a guest's reservations with status arrived, seated, completed or no_show, counted within the filtered period), retention share, occasion mix by covers, party-size buckets (1–2, 3–4, 5–6, 7–8, 9+). The occasion and party mixes count only arrived, seated or completed.
- **Channel performance (period):** bookings, covers and share % per source, excluding cancelled.
- **Reliability (period):** no-show rate (red above target), cancellation rate, average lead time (createdAt → slot, shown in hours or days), total realised (all statuses except pending), and a sparkline of no-show rate per day.
- **Guest feedback:** response count, average rating, rating distribution, top 8 tags, the 10 latest responses, and a detail modal (rating, tags, comments, linked reservation, guest phone, link to the profile). **Not range-filtered.**
- **Filtered reservations table:** search by name, code or phone. Shows the first 50 rows. **Export CSV** of the filtered and searched set.
- "Live as of HH:MM" is fixed when the page renders. Nothing refreshes it.

### 4.2 Settings (`/admin/settings`)
Each card has its own Save button and shows a "Saved at …" flash. Every save writes an audit diff.

| Card | Editable fields | Audit |
|---|---|---|
| Restaurant | name, tagline, intro, address, maps URL, phone, WhatsApp, cancellation policy | `settings.updated` |
| Opening hours & rules | open/close per weekday, booking interval (min 5, step 5), party min/max, lead time, cut-off, no-show target %, over-capacity alert %, closed dates (add/remove chips) | `settings.updated` |
| Guest feedback | title, subtitle, tags (comma-separated with live preview), WhatsApp template (`{{guestName}}`, `{{restaurantName}}`, `{{feedbackUrl}}`; the URL is appended if the template omits it) | `settings.updated` |
| Seating areas | name, capacity, min/max party, bookable; add area (`area-xxxx`, default capacity 10); remove area. Shows total bookable capacity. | `seating_area.updated` |
| Users | name, login, role (SUPER_ADMIN or HOST), active | `user.updated` |
| Data export | Download **all** reservations as CSV | none |

- **No validation:** open can be later than close, min party can exceed max, capacity can be 0. Removing an area that has reservations is not blocked.
- No "closed weekday" toggle. Clearing a weekday's time inputs saves empty strings, which `isOpenOn` treats as closed, but the landing page then renders " to " for that day. Treat this as unsupported.
- `restaurant.email`, `hoursSummary` and `heroEmoji` exist in the type and seed but are not editable or displayed.
- **Users: no add, delete or password.** Existing seed users can only be edited.

### 4.3 Audit log (`/admin/audit`)
- Newest first, capped at **500 events** (older events are dropped).
- Filter by entity type: all, reservation, reservation_status, settings, seating_area, feedback_link. **`user` has no filter option.**
- Each row: description, actor chip, entity type, changed field names, note, timestamp.
- The `changes` payload stores **full before/after values, including PII** (whole user objects, settings objects, reservation fields).

### 4.4 CSV export (`stores/export.ts`)
Columns: `bookingCode, date, time, partySize, status, source, guestName, phone, email, country, seatingArea, occasion, allergies (joined "; "), accessibility, guestNotes, internalNotes, createdAt, updatedAt`. RFC-4180 quoting. Downloads via a Blob. Reachable from Settings (all rows) and the Dashboard (filtered rows).

## 5. Domain module (`src/domain`, pure TS, the part to port)

### 5.1 Types (`types.ts`)
- `Role`: `SUPER_ADMIN | HOST`. No per-venue roles.
- `ReservationStatus`: pending, confirmed, arrived, seated, completed, cancelled, no_show.
  - `ACTIVE_STATUSES` (hold capacity): pending, confirmed, arrived, seated.
  - `TERMINAL_STATUSES`: completed, cancelled, no_show.
- `Channel`: website, instagram, google, whatsapp, walk_in, phone, host. **No `chope_import`.**
- `OpeningHours`: `Record<'mon'..'sun', { open: 'HH:MM', close: 'HH:MM' }>`. **Monday-first keys.**
- `SeatingArea { id, name, capacity, bookable, minParty?, maxParty? }`.
- `Settings`: restaurant info, openingHours, closedDates[], bookingIntervalMinutes, partySizeLimits{min,max}, leadTimeMinutes, cutoffMinutes, noShowTargetPercent, overCapacityAlertPercent, seatingAreas[], cancellationPolicy, feedbackMessageTemplate, feedbackTitle?, feedbackSubtitle?, feedbackTags?.
- `Guest`: fullName, phone (required), email?, country?, allergies[], accessibility?, seatingPreference?, notes?, marketingConsent, marketingConsentAt?.
- `Reservation`: bookingCode, guestId, `date 'YYYY-MM-DD'` + `time 'HH:MM'` (local), partySize, seatingAreaId, occasion?, guestNotes?, internalNotes?, source, status, statusHistory? (embedded), createdBy.
- `ReservationStatusEvent`: from (nullable), to, actorId, actorName, reason?, at.
- `FeedbackResponse`: reservationId, guestId, rating, comments, serviceTags[], submittedAt.
- `AuditEvent`: actorId, actorName, action, entityType (reservation | settings | seating_area | user | reservation_status | feedback_link), entityId, changes?, note?.

### 5.2 Status machine (`status.ts`)
```text
pending   → confirmed | cancelled
confirmed → arrived   | cancelled | no_show
arrived   → seated    | no_show
seated    → completed
completed, cancelled, no_show → (terminal)
```
Exports: `canTransition`, `nextStatuses` (the only source for button rendering), `isTerminal`, `isCancellable`, `isNoShowable`, `statusLabel`, `statusChipClass`, `statusIcon` (Phosphor names). Same-status transitions are rejected. No `reason` is collected in the UI.

### 5.3 Availability (`availability.ts`)
- `generateIntervals(open, close, step)` includes `close`. `getDayAvailability` then marks the slot equal to close as closed, so the last bookable slot is close − step.
- `isOpenOn` returns false for closed dates or a weekday without open/close.
- `reservedCovers(res, date, time, areaId?)` sums `partySize` of ACTIVE statuses at the **exact same date and time** (no dining-duration overlap; see the strategy §3.3 gap).
- `remainingCapacityForParty` filters bookable areas that fit the party's min/max, then picks the area with the **smallest remaining capacity that still fits** (best-fit).
- `checkAvailability(settings, res, draft, { now?, skipTemporal? })` returns `{ ok, reasons[], areaId }`. Reasons: `closed_date, outside_hours, past, lead_time, cutoff, party_too_small, party_too_large, no_area, full`.
  - `lead_time`: minutes to the slot < `leadTimeMinutes`. `cutoff`: minutes to the slot ≤ `cutoffMinutes`. With the seed values (60 / 120) **cut-off is the binding rule: no booking within 2 h**.
  - With an explicit area: that area must be bookable and its party limits and capacity must hold. Without one: best-fit, or `full` / `no_area`.
- `getDayAvailability` maps reasons for the UI to `closed | past | full`, where lead_time and cut-off count as `past` ("Too soon").
- `nextDays(start, n=14)`.

### 5.4 Dates (`dates.ts`)
All arithmetic uses **the browser's local `Date`**: `toISODate`, `fromISODate`, `todayISO`, `addDays`, `daysBetween`, `toMinutes`, `fromMinutes`, `combine`, `isPast`, `dayOfWeek` (Monday-first), `compareTime`. No IANA zone handling (the landing clock is the only `Asia/Makassar` use).

### 5.5 Analytics (`analytics.ts`)
`todayLivePanel`, `upcomingDaysPanel(7|30)`, `guestMixPanel`, `channelPerformancePanel`, `reliabilityPanel`, `actionCues`, `dashboardData`, `filterReservations`, `resolveDateRange`, `defaultDashboardFilters`, `formatLeadTime`, `describeDayLabel`, `pastNDaysRange`. Formulas are in §4.1.

### 5.6 Feedback (`feedback.ts`)
`feedbackMessage(settings, guest, url)` fills the template. `feedbackWhatsAppUrl(...)` returns null unless the status is `completed` and the phone has digits.

### 5.7 Tests (`src/domain/__tests__`)
| File | Tests |
|---|---|
| `availability.test.ts` | 19 |
| `analytics.test.ts` | 13 |
| `status.test.ts` | 10 |
| `feedback.test.ts` | 2 |

## 6. State, persistence and seed data

- Pinia stores: `data` (all entities + `hydrate` + `appendAudit`), `auth`, `reservations` (`create`, `changeStatus`, `update`, `todayReservations`), `settings` (`updateSettings`, `updateAreas`, `updateUsers` with diffing), `export`.
- Every entity persists to `localStorage` with a deep watch. Keys: `gioi.settings.v1`, `gioi.reservations.v1`, `gioi.guests.v1`, `gioi.audit.v1`, `gioi.feedback.v1`, `gioi.users.v1`, `gioi.auth.v1`, and `gioi-theme`.
- **Guest de-duplication:** by phone with spaces stripped. A match overwrites name, email, country, allergies, accessibility and seating preference with the new input. Marketing consent is never updated on an existing guest.
- **Booking code:** `GIOI-` + base36 of (number of codes + 1), padded to 4 characters. **Sequential and guessable.**
- **IDs:** `r_`, `g_`, `a_`, `s_` + random base36. Not UUIDs.
- Status events are embedded in `reservation.statusHistory` and also written to the audit log.
- Seed (`scripts/generate-seed.mjs`, anchored to `2026-09-30` and shifted to the browser's today by `composables/dateAnchor.ts`): 45 guests, 160 reservations, 16 feedback responses, 8 audit events, 3 users (Yodha Kautsar SUPER_ADMIN, Putu Sari HOST, Made Wirawan SUPER_ADMIN), 4 areas:

| Area | Capacity | Party limit |
|---|---|---|
| Main Hall | 24 | none |
| Sunset Terrace | 14 | min 2 |
| Chef's Counter | 6 | max 4 |
| Beachfront Lounge | 16 | min 2 |

Total bookable capacity is 60. Opening hours are 10:00–22:00 daily, the interval is 30 minutes, party size is 1–8, closed dates are 2026-12-25 and 2026-01-01. Reservation sources in the seed: walk_in 29, instagram 28, website 25, google 21, host 20, phone 19, whatsapp 18.
- `scripts/record-demo.mjs` (Playwright, `pnpm record`) drives the UI for demo recordings. It depends on current selectors, which is why `prototype/` must stay untouched.
- Theme (`useTheme`): guest routes follow the OS setting, staff routes default to dark, a manual toggle persists.

## 7. In the execution strategy, NOT in the prototype

Build these from the design docs, not by "porting". Nothing in `prototype/` implements them.

| Strategy item | Prototype reality |
|---|---|
| Multi-venue, `/:venue` routes, `venue_id`, `user_venues`, `is_super_admin` | Single venue, routes have no slug, global roles |
| Venue IANA time zone, `starts_at timestamptz` | Browser-local `date` + `time` strings |
| Real auth (login + password, argon2id, sessions table) | Role picker, `userId` in localStorage |
| User create / delete / password reset | Edit seed users only |
| `GET/POST` API, Prisma, Postgres | None. All in-browser |
| Capacity row lock, concurrency safety | Last write wins in one browser |
| Idempotency key on booking submit | None |
| Turnstile, rate limiting | None |
| Guest self-cancel (`POST /public/reservations/:code/cancel`) | Not implemented. No cancel on confirmation |
| Staff edit reservation (host "edit") | Store function only, no UI |
| Staff create future-dated phone booking | Walk-in modal is today-only |
| Internal notes entry, guest profile editing | Display only |
| One feedback per reservation (unique) | Not enforced |
| Feedback endpoint restricted to `completed` | Enforced in the UI only |
| `chope_import` channel, Chope/spreadsheet import | Not implemented |
| Guest PII export / anonymisation (UU PDP) | Not implemented. CSV export is reservations only |
| Audit log without PII values, append-only | Stores full before/after values, capped at 500 |
| Dining-duration overlap capacity | Exact-slot only |
| Walk-in capacity override | None. Walk-ins are blocked when full |
| Host/dashboard polling | None |
| SEO prerender, `useSeoMeta`, `Restaurant` JSON-LD | None |
| Host vs admin subdomain split | One SPA |
| Venue `email` editing, `timeZone`, `dining_minutes` | Not in settings UI |
| Weekday "closed" (no hours) in settings | No toggle. Only works by clearing both time inputs, which breaks the landing hours list |
| Notifications (WhatsApp/email confirmations) | None. Only the manual WhatsApp feedback link |
| Payments / deposits | None |
| Indonesian copy | English only |

## 8. Prototype behaviour production must NOT copy

| Prototype | Production rule |
|---|---|
| Sequential `GIOI-000N` booking codes | Random codes (strategy §3.1) |
| Confirmation page shows `guestNotes` | Public responses exclude notes, phone and allergies (strategy §3 table, week 3 API) |
| Audit `changes` hold PII values | Record field names only for guest PII (strategy §3.8) |
| `new Date()` local-time maths | Venue-zone functions (strategy week 2, §3.2) |
| Guest match by phone with spaces stripped | E.164 normalisation, unique `(venue_id, phone)` |
| Re-booking overwrites guest allergies etc. | Decide the merge rule explicitly. The prototype silently overwrites |
| Settings saved without validation | API schema + DB CHECKs (strategy §3.5) |
| Removing an area that holds reservations | FK prevents it; use `bookable = false` |
| Status events embedded in the reservation | `reservation_status_events` table |
| Opening hours as `'HH:MM'` Mon-keyed map | `smallint` minutes, `weekday 0 = Monday` (strategy §3.4). The Monday-first index matches |
| Login picks "first active user with role" | Real per-user login |

## 9. README drift (README is wrong, code is right)

- README says the confirmation "never" shows special-request data. It shows `guestNotes`.
- README says 38 tests. There are 44.
- README "Out of scope" lists feedback forms as Phase 4. The native feedback form, WhatsApp feedback link, feedback settings and dashboard feedback panel are already built.
- README omits `FeedbackView`, `DatePicker`, `StatusChip`, `useTheme`, and the `feedback.ts` domain file.
- README says "Sign in as Made (Super Admin)". The role picker signs in the first active SUPER_ADMIN (Yodha Kautsar).
- README says seed has 40 guests / ~155 reservations. The checked-in seed has 45 / 160.
- README says "Reset demo data" wipes localStorage. `clearDemoStorage()` omits `gioi.feedback.v1`, but `hydrate(true)` removes it, so the outcome is correct.
