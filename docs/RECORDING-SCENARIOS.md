# GIOI Prototype — Browser Recording Scenarios

Use these scenarios to record a client-facing walkthrough of the GIOI Bali reservation platform prototype.

## Recording setup

- Open the running prototype at the local Vite URL.
- Use a desktop browser viewport first; record a second short mobile-width clip for the public booking flow if useful.
- Keep the browser zoom at 100%.
- Start each scenario from a clean state when noted: use **Reset demo data** in the staff header, or reload the public page.
- Pause briefly after each navigation, tab switch, modal, and status change so the video shows the result.
- This is a frontend-only prototype. Do not describe demo role selection as real authentication or claim that messages/emails are sent.

## Suggested recording order

1. Public restaurant experience
2. Guest booking and confirmation
3. Host service-day operations
4. Guest search and guest profile
5. Manager dashboard
6. Settings and data export
7. Audit trail and role access

---

## Scenario 1 — Public restaurant experience

**Goal:** Show the guest-facing brand experience and the fast booking entry point.

**Start:** `/`

**Steps:**

1. Show the hero headline: **Fresh from the coast. Made for sunset.**
2. Slowly scroll through **From first light to last call** and the three dining scenes.
3. Show the beachfront location, food, and visit information.
4. Return to the hero and use the date picker and guest count in the booking shortcut.
5. Click **Find a table**.
6. Return to `/` and click the floating theme button to show light/dark mode; leave the preferred theme enabled for the next public scenario.
7. Click **Reserve a table** to enter the full booking flow.

**Show in the video:**

- Restaurant positioning and visual identity.
- Experience, visit, location, contact, and reservation entry points.
- Theme switch.
- Direct path from the landing page to a date-and-party-size booking.

---

## Scenario 2 — Guest makes a reservation

**Goal:** Demonstrate availability, guest details, privacy-sensitive notes, and confirmation.

**Start:** `/book` or the end of Scenario 1.

**Steps:**

1. In **1. When**, choose a future open date. Use **More dates** if the first date is closed.
2. Adjust the guest count with `−` and `+`.
3. Show that unavailable time slots are disabled, then select an available time.
4. Optionally select a seating preference such as **Beachfront** or leave **Anywhere** selected.
5. Expand **3. Details (optional)**.
6. Select **Birthday** or **Date night**.
7. Select **Vegetarian** and/or **Shellfish allergy** to demonstrate dietary capture.
8. Enter an accessibility need, for example `Ground floor table`.
9. Enter a special request, for example `Beachfront table if possible`.
10. Fill **Full name**, **WhatsApp / phone**, and optional **Email** and **Country / city**.
11. Check **I understand the cancellation policy.** Optionally check marketing consent.
12. Click **Confirm booking**.
13. On the confirmation page, pause on the booking code, date, time, guest count, seating, notes, and **Confirmed** status.
14. Click **Copy** and show the button changing to **Copied**.
15. Show **Add to calendar**, **Get directions**, and **Message us** as available follow-up actions. Do not leave the recording for the external links.

**Show in the video:**

- Date, party-size, seating, and live slot availability.
- Required versus optional guest information.
- Occasion, dietary/allergy, accessibility, and special-request fields.
- Cancellation-policy acknowledgement.
- Confirmation code and calendar/directions/contact actions.
- The public confirmation does **not** display allergy or accessibility data.

**Reset:** Reset demo data before repeating this scenario. A completed booking changes the local demo state.

---

## Scenario 3 — Availability rules and booking guardrails

**Goal:** Make the live booking rules visible without implying that disabled controls are broken.

**Start:** `/book` after reset.

**Steps:**

1. Open the date selector and show the available date buttons across the next 14 days.
2. Select a closed date if one is visible and show that its time grid is unavailable.
3. Return to an open date and select a party size.
4. Point out disabled time slots and explain that the prototype applies lead-time, cut-off, closed-date, capacity, and party-size rules.
5. Choose the maximum party size and show the **Message us on WhatsApp** prompt for larger groups.
6. Try to continue without choosing a time, without required contact information, or without accepting the cancellation policy. Show that **Confirm booking** remains unavailable.
7. Complete the required fields only if you want to finish with a valid booking.

**Show in the video:**

- Closed dates and unavailable slots are handled in the interface.
- Booking cannot be submitted until the required conditions are met.
- Larger-party requests are redirected to a contact path rather than forced through normal capacity rules.

---

## Scenario 4 — Host service-day operations

**Goal:** Demonstrate the front-of-house view, reservation alerts, status progression, and walk-ins.

**Start:** `/login`

**Steps:**

1. Click **Sign in as Putu →**.
2. In **Today's service**, show the service date, booking count, active count, and time-grouped reservations.
3. Point out a reservation with an allergy alert, accessibility alert, guest note, or **Repeat** badge.
4. Open a guest by clicking the guest name.
5. Return to the host view using **Back to host**.
6. On a reservation, progress the status through the available valid actions: **Pending → Confirmed → Arrived → Seated → Completed**. Pause after each change so the status chip and action buttons are visible.
7. For a suitable pending or confirmed booking, demonstrate **Cancel**. For a suitable confirmed or arrived booking, demonstrate **No-show** only if this will not disrupt the rest of the recording; reset afterward if needed.
8. Click **+ Walk-in**.
9. Fill the walk-in guest details, choose a party size and seating area, and create the walk-in reservation.
10. Show that the new walk-in appears in today's service list.
11. Use **Previous**, **Today**, and **Next** to show service-day navigation, then return to **Today**.

**Show in the video:**

- A practical host-facing service-day queue.
- Allergy and accessibility alerts are visible to staff, not public guests.
- Repeat-guest recognition.
- Controlled reservation status transitions.
- Same-day walk-in creation.
- Date navigation.

**Reset:** Reset demo data before this scenario if the public booking scenario was recorded first.

---

## Scenario 5 — Guest search and profile history

**Goal:** Show how staff find a guest and use their visit history and alerts.

**Start:** `/host` while signed in as Host, or sign in again at `/login`.

**Steps:**

1. Click the **Guest search** tab.
2. Search by a visible seeded guest name. If needed, search by phone or email instead.
3. Open a result.
4. Show the guest header: contact details, guest-since date, marketing-consent state, visit count, cancellations, and no-shows.
5. Show allergy, accessibility, seating preference, and internal notes when present.
6. Scroll through **Visit history**.
7. Expand **Status history** for a reservation to show the chronological status changes and acting user.
8. Return to the host view.

**Show in the video:**

- Search by name, phone, or email.
- Staff-only guest context and operational notes.
- Reservation history and status audit detail.

---

## Scenario 6 — Manager dashboard

**Goal:** Show the operational overview and action cues available to management.

**Start:** `/login`

**Steps:**

1. Click **Sign in as Made →**.
2. Open **Dashboard** from the staff navigation.
3. Pause on **Action cues** and read the visible alerts, such as over-capacity slots, high no-show rate, high cancellation rate, or an allergy repeat guest.
4. Show **Today live**: bookings, expected covers, arrived, seated, completed, no-shows/cancellations, and capacity fill.
5. Show **Next 7 days — covers** and the busiest slot.
6. Scroll to **Next 30 days — covers per day**.
7. Show **Guest mix**, including total guests, first-timers, repeats, retention share, occasions, and party size.
8. Show **Channel performance (last 30d)**.
9. Show **Reliability (last 30d)**, including no-show rate, cancellation rate, average lead time, realised covers, and trend.

**Show in the video:**

- One-page management overview.
- Forward-looking demand and capacity visibility.
- Guest mix and acquisition-channel performance.
- Reliability metrics with target comparison.
- Actionable cues rather than charts alone.

---

## Scenario 7 — Settings, seating areas, users, and CSV export

**Goal:** Demonstrate operational configuration and data export.

**Start:** `/admin/settings` as Super Admin.

**Steps:**

1. Open **Settings**.
2. In **Restaurant**, edit a harmless value such as the tagline, then click **Save restaurant** and show the saved timestamp.
3. In **Opening hours & rules**, show opening/closing times, booking interval, minimum/maximum party size, lead time, cut-off, no-show target, and over-capacity alert threshold.
4. Click **+ Add** under **Closed dates**, enter a valid future date in `YYYY-MM-DD` format, then click **Save hours & rules**. Remove it afterward if the recording continues with booking tests.
5. In **Seating areas**, show names, capacities, party-size limits, bookable toggles, and total bookable capacity.
6. Add a seating area, rename it, and click **Save seating areas**. Remove the temporary area afterward if desired.
7. In **Users**, show name, login, role, and active state. Click **Save users** without changing access unless the client specifically wants that demonstration.
8. In **Data export**, click **Download reservations CSV** and show the browser download confirmation.

**Show in the video:**

- Restaurant content and policy configuration.
- Availability and alert rules.
- Seating capacity management.
- User-role management.
- Reservation CSV export.

**Data note:** The export contains guest contact, allergy, and accessibility information. Treat the downloaded file as sensitive demo data.

---

## Scenario 8 — Audit log

**Goal:** Show traceability for reservation and configuration changes.

**Start:** `/admin/audit` as Super Admin, after at least one status or settings change.

**Steps:**

1. Open **Audit** from the staff navigation.
2. Show the newest events with action description, timestamp, actor, entity type, changed fields, and notes where present.
3. Use the filter to show **Reservations**.
4. Use the filter to show **Status changes**.
5. Use the filter to show **Settings**, **Seating areas**, or **Users** if those changes were made in Scenario 7.
6. Return to **All events**.

**Show in the video:**

- Status changes and settings updates are recorded.
- Each event identifies who acted, when, what entity changed, and which fields changed.
- Filters make the log usable during review.

---

## Scenario 9 — Role access and demo reset

**Goal:** Show the difference between Host and Super Admin access and leave the prototype clean.

**Start:** Sign out, then `/login`.

**Steps:**

1. Sign in as **Putu** using **Sign in as Putu →** and show the Host navigation: Host only.
2. Try to open `/admin/dashboard` directly. Show that the Host is redirected away from the Super Admin page.
3. Sign out.
4. Sign in as **Made** using **Sign in as Made →** and show Host, Dashboard, Settings, and Audit navigation.
5. Click **Reset demo data**.
6. Verify that the page reloads with seeded bookings and dashboard data restored.

**Show in the video:**

- Role-specific navigation and route protection.
- Resetting local demo state for the next presentation.

**Prototype disclaimer to say or add as an overlay:**

> This is a clickable frontend prototype. Data is stored in this browser only; login is a role picker; no real messages, emails, integrations, or shared multi-user database are connected.

---

## Optional short closing clip

Return to `/`, scroll to the final **Make sunset your reservation** section, and click **Reserve a table** to close on the product's main conversion path.
