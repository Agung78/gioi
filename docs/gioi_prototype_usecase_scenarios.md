# GIOI Bali Prototype
## Use-Case Scenarios & Requirements Walkthrough

**Purpose:** Demonstrate the implemented prototype against the requirements in:

- [`gioi_client_scope_and_delivery.md`](./gioi_client_scope_and_delivery.md)
- [`gioi_reservation_platform_design.md`](./gioi_reservation_platform_design.md)

**Prototype type:** Frontend-only, browser-local demonstration. It proves the main user journeys and business rules; it is not production authentication, a shared database, or a live integration with Chope, WhatsApp, email, or payments.

---

## 1. Demo preparation

### Start the prototype

```bash
cd gioi/prototype
pnpm install
pnpm dev
```

Open the Vite URL in a desktop browser or tablet-sized viewport.

### Reset before each run

Use **Reset demo data** in the application header. This restores the deterministic sample reservations, guests, settings, users, and audit data.

### Demo users

| User | Role | Demonstrates |
|---|---|---|
| Putu | Host | Service-day operations and guest history |
| Made | Super Admin | Dashboard, configuration, audit, and export |

The login screen is a role selector in this prototype. It is not real authentication.

### Evidence convention

A scenario is **Working** when the described result is visible in the prototype. **Simulated** means the prototype demonstrates the application behavior without the real external service. **Deferred** means the requirement is intentionally outside the first prototype or first-release implementation.

---

## 2. Scenario index

| ID | Scenario | Result |
|---|---|---|
| S1 | Public GIOI landing page | Working |
| S2 | Guest makes a direct reservation | Working |
| S3 | Availability and conflict prevention | Working |
| S4 | Host runs the service day | Working |
| S5 | Returning guest and sensitive service information | Working |
| S6 | Super Admin configures the operation | Working |
| S7 | Dashboard supports management decisions | Working |
| S8 | Export and operational ownership | Working |
| S9 | Provider outage and manual fallback | Simulated |
| S10 | Historical data migration review | Deferred; seed data demonstrates history only |
| S11 | Responsive browser operation | Working |
| S12 | Explicit first-release boundaries | Deferred by design |

---

## 3. Scenario S1 — Public GIOI landing page

**Requirements covered:** Scope §2A; Design §1 and §3.1.

### Steps

1. Open `/` without signing in.
2. Review the restaurant introduction, dining content, imagery, opening hours, location, contact details, and **Reserve a table** call-to-action.
3. Select **Reserve a table**.

### Expected result

- The landing page presents GIOI Bali as the direct booking destination.
- The reservation flow opens from the landing page.
- No internal guest history, allergy information, accessibility information, or service notes is displayed publicly.
- The landing page acts as the public client of the reservation flow; it does not expose internal data.

**Evidence:** Public landing page and reservation entry point are visible before login.

---

## 4. Scenario S2 — Guest makes a direct reservation

**Requirements covered:** Scope §2B and §6; Design §3.1, §5, §8, and Acceptance Criteria.

### Steps

1. From the landing page, open the reservation flow.
2. Choose a future date, available time, party size, and seating area.
3. Enter:
   - Full name.
   - WhatsApp/mobile number.
   - Email, if desired.
   - Country or city, if desired.
   - Occasion.
   - Dietary restrictions or allergies.
   - Accessibility requirements.
   - Special request.
4. Review the cancellation policy and consent controls.
5. Submit the reservation.

### Expected result

- The system checks availability before creating the reservation.
- A confirmation page shows a booking code, date, time, party size, and seating area.
- The confirmation page does **not** expose allergy or accessibility information.
- The reservation is stored with the website source and is visible to authenticated internal users.
- The guest is matched to an existing guest record where the prototype can identify the same guest; otherwise a guest record is created.
- The flow works without a messaging or payment provider.

**Evidence:** Confirmation page plus the new reservation in the Host view.

**Prototype note:** Payment, WhatsApp, and email are not connected. The confirmation page is the prototype's manual confirmation fallback.

---

## 5. Scenario S3 — Availability and conflict prevention

**Requirements covered:** Scope §2B and §5; Design §3.1 and §4; Reliability §8.

### Steps

1. In the public booking flow, choose a date with a full or unavailable slot.
2. Try dates and times that are:
   - Before the booking lead time.
   - Past the booking cut-off.
   - Outside opening hours.
   - On a closed date.
   - Below or above the configured party-size limits.
   - Full for the selected seating area.
3. Choose an available slot and submit a booking.
4. Return to the same date, time, and seating area and try to exceed the remaining capacity.

### Expected result

- Unavailable slots are disabled or identified with the reason they cannot be booked.
- The system respects opening hours, closed dates, intervals, party-size limits, seating-area capacity, lead time, and cut-off rules.
- A full slot cannot create a confirmed reservation.
- A valid reservation reduces the remaining availability.
- No inconsistent or conflicting booking is created.

**Evidence:** Availability grid changes by date and party size; a full slot cannot be selected or submitted.

**Production acceptance still required:** The prototype demonstrates the rule behavior locally. Production must enforce the final check atomically on the server/database for concurrent requests.

---

## 6. Scenario S4 — Host runs the service day

**Requirements covered:** Scope §2C, §3, and §4; Design §2, §3.2, and §4.

### Steps

1. Open `/login`.
2. Select **Sign in as Putu (Host)**.
3. Review today's reservations grouped by time slot.
4. Open a reservation and review guest details, occasion, dietary information, accessibility requirements, and service notes.
5. Progress the reservation through:

   ```text
   Pending -> Confirmed -> Arrived -> Seated -> Completed
   ```

6. On another reservation, demonstrate **Cancelled**.
7. On another eligible reservation, demonstrate **No-show**.
8. Use **+ Walk-in** to create a same-day reservation.
9. Search by guest name, phone number, email, booking code, or time.

### Expected result

- Today's bookings are the primary Host view.
- One-tap status actions are shown only when the transition is valid.
- Invalid lifecycle transitions are unavailable.
- The status history records each change with the actor, time, previous status, new status, and optional reason.
- Walk-ins can be added by the Host and appear in today's service view.
- The Host can edit operational booking details and add service notes.
- The Host cannot access configuration, user management, export, or administrative audit controls.

**Evidence:** Updated status chip, status history in the guest profile, and the changed live counts on the service view/dashboard.

---

## 7. Scenario S5 — Returning guest and sensitive service information

**Requirements covered:** Scope §2D and §6; Design §2, §3.2, §5, and privacy requirements in §8.

### Steps

1. In the Host view, open **Guest search**.
2. Search for a seeded guest by name, phone, or email.
3. Open the guest profile.
4. Review visit count, previous reservations, cancellation/no-show history, seating preferences, occasion history, allergies, accessibility needs, and internal service notes.
5. Return to the public confirmation page or public booking URL.

### Expected result

- A returning guest is identifiable through reservation history.
- Relevant alerts are visually prominent to authenticated staff.
- The profile shows a chronological reservation history and status changes.
- Sensitive operational information is visible in the authenticated Host/Admin application only.
- Sensitive information is not exposed in public booking confirmations or public URLs.

**Evidence:** Guest profile with repeat-guest indicator and allergy/accessibility alert; public confirmation without those fields.

---

## 8. Scenario S6 — Super Admin configures the operation

**Requirements covered:** Scope §3 and §5; Design §2.2, §3.3, §5, and §8.

### Steps

1. Sign in as **Made (Super Admin)**.
2. Open **Settings**.
3. Change one or more of the following:
   - Opening hours.
   - Closed date.
   - Booking interval.
   - Booking lead time or cut-off.
   - Party-size limit.
   - Seating-area capacity.
   - Booking policy.
   - Host user details or active status.
4. Return to the public booking flow and confirm the changed rule affects availability.
5. Open **Audit**.

### Expected result

- Super Admin can configure operational rules and seating areas.
- Super Admin can manage Host accounts.
- A Host cannot access these settings or the audit view.
- Configuration changes are logged with actor, timestamp, changed fields, and previous/new values where applicable.
- New availability reflects the configured rule.

**Evidence:** Changed setting, changed booking availability, and matching audit entry.

**Prototype note:** Role selection is simulated. Production must enforce authorization server-side for every protected action.

---

## 9. Scenario S7 — Dashboard supports management decisions

**Requirements covered:** Scope §9; Design §9 and initial reporting requirements.

### Steps

1. Sign in as **Made (Super Admin)**.
2. Open **Dashboard**.
3. Review the five panels:
   - **Today live:** bookings, expected covers, arrived/seated/completed covers, no-shows, cancellations.
   - **Next 7 / 30 days:** covers by day and slot, busy slots, capacity fill.
   - **Guest mix:** first-timers/repeat guests, occasions, party sizes.
   - **Channel performance:** website, Instagram, Google, WhatsApp, Chope, walk-in, phone, and Host sources.
   - **Reliability:** no-show/cancellation rate and booking lead time.
4. Compare the displayed action cues with the seeded data.
5. Change a reservation status in the Host view, then return to the dashboard.

### Expected result

- Dashboard values are calculated from reservation data in the local store.
- Status changes update the live operational counts.
- Action cues identify exceptions such as:
   - A slot above the configured capacity threshold.
   - No-show rate above target.
   - A repeat guest with allergy notes arriving today.
- Metrics use reservation data and do not claim revenue or POS data.

**Evidence:** Five dashboard panels, visible action cues, and counts changing after a status update.

**Prototype note:** This demonstrates the dashboard calculations with seeded/local data. It is not a shared real-time multi-user dashboard until connected to a server database.

---

## 10. Scenario S8 — Export and operational ownership

**Requirements covered:** Scope §1B, §3, §9, and §12; Design §1 goals, §3.3, §5, §8, and Acceptance Criteria.

### Steps

1. Sign in as **Made (Super Admin)**.
2. Open the export function.
3. Export reservations, guests, or operational data.
4. Sign in as **Putu (Host)** and verify that export controls are unavailable.

### Expected result

- Super Admin can export operational reservation and guest data.
- Export is not available to Host users.
- The exported data demonstrates GIOI-owned operational records rather than dependence on marketplace reporting.
- Reservation source, status, guest, date, time, party size, and operational fields remain traceable.

**Evidence:** Downloaded CSV and role-specific visibility of the export control.

---

## 11. Scenario S9 — Provider outage and manual fallback

**Requirements covered:** Scope §8; Design §6, §7, and §8.

### Demonstration mode

The prototype has no real payment, WhatsApp, or email provider. Demonstrate the provider-independent path instead:

1. Create a direct reservation without external messaging.
2. Confirm that the booking still appears in the Host view and dashboard.
3. Use the on-screen confirmation as the manual Host confirmation fallback.
4. Continue the full Host lifecycle without sending a message or receiving payment status.

### Expected result

- The core reservation workflow remains usable without external providers.
- A failed or unavailable notification does not prevent the local reservation flow in the prototype.
- Provider-specific credentials and provider data are not required to use the core demo.

**Production acceptance still required:** Provider adapters, idempotent callbacks, payment status handling, delivery logs, and secure server-side credentials are design requirements for a production integration, not implemented in this browser-only prototype.

---

## 12. Scenario S10 — Historical data migration review

**Requirements covered:** Scope §7; Design §3.4 and Acceptance Criteria.

### Prototype result

The migration workflow is **not implemented**. Seeded guests, reservations, status histories, and channel sources demonstrate the shape of historical data that the application will operate on, but they are not evidence of a real Chope/spreadsheet import.

### Required production acceptance flow

1. Upload a structured Chope or spreadsheet export.
2. Normalize phone numbers where possible.
3. Validate required fields.
4. Preview invalid rows and probable duplicate guests.
5. Require Super Admin approval.
6. Import without silent overwrite or merge.
7. Record source and import timestamp.

**Do not present S10 as working in the current prototype.** It is a clearly identified implementation gap and a separate controlled delivery step.

---

## 13. Scenario S11 — Responsive browser operation

**Requirements covered:** Scope §1, §2C, and §3; Design §1 and Host design requirement.

### Steps

1. Open the prototype in a desktop browser.
2. Resize to a tablet-sized viewport or use browser device emulation.
3. Repeat the Host daily view, reservation detail, status action, and guest search flows.
4. Repeat the public booking flow on a mobile-sized viewport.

### Expected result

- Public booking works on mobile-sized screens.
- Host operations remain usable on a tablet-sized screen.
- Desktop and tablet users share the same web application.
- No native iOS or Android application is required for this prototype.

**Evidence:** The same flows remain accessible at desktop, tablet, and mobile viewport widths.

---

## 14. Scenario S12 — Explicit first-release boundaries

**Requirements covered:** Scope §10–§11; Design §1 non-goals and §9 future roadmap.

The following must **not** be presented as working first-release prototype capabilities:

- POS or Kitchen Display System integration.
- Full omnichannel inbox.
- WhatsApp or email delivery.
- Deposit/payment provider integration.
- Chope synchronization or live migration.
- Marketing broadcasts or chatbot booking.
- Loyalty, feedback, or re-engagement workflows.
- Predictive demand planning.
- RFM, lifetime value, or revenue analytics.
- Automated VIP classification.
- Complex visual table-map management.
- Native iOS or Android apps.
- Multi-restaurant management.

These are later-phase options or production integrations. Keeping them outside the prototype proves that the reservation-first scope remains clear.

---

## 15. Requirement coverage matrix

| Requirement area | Prototype evidence | Status |
|---|---|---|
| GIOI landing page and direct booking entry | S1 | Working |
| Direct reservation fields and confirmation | S2 | Working |
| Availability and conflict prevention | S3 | Working locally; server atomicity still required |
| Opening hours, closed dates, intervals, capacity, lead/cut-off rules | S3 and S6 | Working |
| Party-size and seating-area rules | S3 and S6 | Working |
| Reservation lifecycle and status history | S4 | Working |
| Host service-day workflow | S4 | Working |
| Host search and walk-ins | S4 and S5 | Working |
| Guest history and visit count | S5 | Working |
| Allergy/accessibility/service-note visibility | S5 | Working |
| Public privacy boundary | S1, S2, and S5 | Working in prototype surface |
| Super Admin settings and user management | S6 | Working locally |
| Host restriction from admin controls | S6 and S8 | Prototype route/UI behavior; server authorization still required |
| Audit trail | S4 and S6 | Working locally |
| Manager dashboard panels and action cues | S7 | Working locally |
| Operational export | S8 | Working locally |
| Responsive web operation | S11 | Working |
| Manual operation without providers | S9 | Simulated |
| Messaging adapter and provider callbacks | S9 | Deferred |
| Payment/deposit integration | S9 | Deferred |
| Chope/spreadsheet migration review | S10 | Deferred |
| Backups, deletion procedures, rate limiting, secure sessions | — | Production implementation required |
| POS/KDS, marketing, loyalty, predictive analytics | S12 | Explicitly out of scope |

---

## 16. Pilot sign-off checklist

A stakeholder can sign off the prototype walkthrough when they have observed:

- [ ] A guest can book directly from the GIOI landing page.
- [ ] The booking flow captures the agreed guest and visit details.
- [ ] Unavailable and conflicting bookings are rejected.
- [ ] The confirmation does not expose sensitive guest information.
- [ ] A Host can operate a complete service day.
- [ ] Reservation statuses and status history are traceable.
- [ ] A Host can find a returning guest and see relevant alerts.
- [ ] A Super Admin can configure rules and users.
- [ ] Configuration changes appear in the audit log.
- [ ] Dashboard metrics and action cues are visible.
- [ ] Operational data can be exported by Super Admin.
- [ ] The core flow works without messaging or payment providers.
- [ ] The prototype works in desktop, tablet, and mobile browser layouts.
- [ ] Deferred capabilities are understood as future work, not hidden launch dependencies.

**Prototype conclusion:** The clickable prototype demonstrates the reservation-first product direction, the three core surfaces, the two application roles, the operational lifecycle, lightweight guest history, configurable availability, auditability, export, and manager visibility. Production readiness additionally requires a shared backend, real authentication/authorization, transactional concurrency control, migration tooling, backups/privacy procedures, and selected provider integrations.
