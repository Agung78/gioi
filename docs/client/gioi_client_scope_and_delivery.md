# GIOI Bali Reservation Platform
## Client Scope & Delivery Definition

**Client:** GIOI Bali Restaurant  
**Document purpose:** Confirm the expected scope for the first release and distinguish it from the broader CRM concept previously proposed.

---

## 1. Executive Summary

The first release will be a **direct reservation and internal guest-history system for GIOI Bali**.

It will help GIOI:

- Accept direct reservations through a new GIOI Bali landing page.
- Replace Chope as the primary direct reservation flow.
- Give the restaurant team one internal view of reservations.
- Preserve guest preferences and reservation history between visits.
- Give management a reliable foundation for future reporting and data intelligence.

This is **not** a full CRM, marketing automation platform, POS system, or predictive analytics product at launch.

The platform will be delivered as a responsive web-based system. It will run in modern desktop and mobile browsers, including restaurant tablets. Native iOS and Android applications are not included.

The system will first solve the operational reservation problem. Additional intelligence and automation can be added after GIOI has collected enough reliable data.

---

## 1.1 GIOI Ocean Gourmet at a Glance

- **Venue:** GIOI Ocean Gourmet — beachfront lifestyle dining at Discovery Mall Bali, Kuta. The newest venue from GIOI Group, which began in Jakarta in 2016.
- **Capacity:** 100 seats.
- **Hours:** 10:00–22:00, open 7 days a week.
- **Menu:** Indonesian, Asian, Balinese and Western. Signature dishes: Salmon Lodeh and Crispy Duck.
- **Experience:** Sunset views, live music, and cultural dances and fire shows on weekends.

Source: gioigroup.com, Tripadvisor, GIOI Ocean Gourmet public pages.

---

## 1A. Why This Project Is Urgent

### GIOI today

| Area | Current condition | Cost of waiting |
|---|---|---|
| Booking intake | Reservations arrive through Chope, WhatsApp, phone, Instagram DMs, and walk-ins. | Every channel is a separate queue; bookings outside staff hours wait or are lost. |
| Guest data | Guest history lives in Chope, personal WhatsApp chats, notebooks, and spreadsheets. | Each month adds more guest data GIOI does not fully own or cannot consolidate. |
| Guest memory | Allergies, occasions, and seating preferences depend on staff memory. | Service quality drops at shift changes and when staff leave. |
| Management visibility | No single live view of covers, no-shows, cancellations, or booking source. | Staffing, purchasing, and promotions are planned on instinct rather than data. |
| Platform cost | Chope charges on booking volume (commission-based model). | Cost grows with GIOI's success, while the guest relationship stays on the marketplace. |

### Why now, not later

- **Data compounds.** Retention, repeat-guest, and demand insights need months of clean history. Starting later delays every future insight by the same amount.
- **Marketplace ownership changed.** Chope was acquired by Grab in July 2024 and now sits inside Grab's commerce business. Commercial terms and product direction are set outside GIOI's control.
- **Peak-season readiness.** A direct channel must be stable before the next high season, not built during it.
- **Migration gets harder.** The longer bookings stay fragmented, the larger and messier the historical import becomes.

### GIOI figures to confirm for the presentation

| Metric | Value |
|---|---|
| Monthly reservations (all channels) | [fill in] |
| Share of reservations coming via Chope | [fill in] |
| Current Chope monthly fee + per-booking charges | [fill in from Chope invoice] |
| Estimated no-show rate | [fill in] |
| Booking requests received outside staff hours | [fill in / estimate] |

---

## 1B. Chope vs GIOI Reservation Platform

| Dimension | Chope | GIOI Reservation Platform |
|---|---|---|
| **Guest data ownership & extraction** | Guest data sits on a third-party marketplace; export depth and format are controlled by the vendor. | GIOI owns the database. Full CSV export of reservations, guests, and history at any time. |
| **24/7 operation** | Bookings available 24/7 through the Chope app, but inside Chope's branded marketplace. | Direct booking runs 24/7 on GIOI's own landing page. Availability rules, capacity limits, and policies are enforced automatically — no staff needed to watch WhatsApp at night. Every change is audit-logged for admin review next morning. |
| **Personalized platform** | Standard Chope-branded flow, shared with thousands of listed restaurants; promotion and discount pressure from the marketplace. | GIOI-branded experience, GIOI's own booking rules, seating areas, policies, occasion and dietary questions. Designed around GIOI's operating model. |
| **Guest relationship** | Guest discovers and books "via Chope"; restaurant competes next to other listings. | Guest books directly with GIOI; every repeat visit builds GIOI's own guest history. |
| **Monthly cost** | Commission-based, scales with booking volume; can reach five-figure annual fees at volume. | One-time build + fixed hosting/maintenance. No per-booking commission. Optional provider costs (WhatsApp, payment) are pay-as-used and transparent. |
| **Management insight** | Vendor reports inside vendor tooling. | Real-time manager dashboard on GIOI data (see Section 9). |
| **Extensibility** | Limited to vendor roadmap. | Roadmap owned by GIOI: WhatsApp automation, feedback, loyalty, analytics. |
| **Discovery reach** | Strong: largest reservation marketplace in Southeast Asia. | Relies on GIOI's own channels (Instagram, Google, direct links). |

**Positioning:** the platform is not a marketplace. Chope may remain an optional discovery channel during transition; the direct platform becomes GIOI's primary booking system and data owner.

### Monthly cost comparison (to complete with GIOI figures)

| Item | Chope | GIOI Platform |
|---|---|---|
| Subscription / hosting | [Chope fee] | [hosting + maintenance fee] |
| Per-booking commission | [rate × monthly bookings] | 0 |
| Messaging (optional) | Included/limited per plan | [WhatsApp provider usage] |
| **Estimated monthly total** | [fill in] | [fill in] |
| **12-month total** | [fill in] | [fill in incl. build cost amortization] |

---

## 2. What We Are Building

### A. GIOI Bali public landing page

The landing page will present GIOI Bali online and direct guests to the reservation flow.

Expected content includes:

- Restaurant introduction and positioning.
- Food, dining experience, or menu information.
- Restaurant photos and visual content.
- Opening hours.
- Location and Google Maps direction link.
- Contact details.
- Reservation call-to-action.
- Mobile-friendly layout for guests coming from Instagram, Google, and direct links.

The landing page will connect to the reservation system. It will not store reservations independently.

### B. Direct reservation system

Guests will be able to:

1. Select a date.
2. Select an available time.
3. Enter the number of guests.
4. Select an available seating area, if applicable.
5. Enter their contact information.
6. Add occasion, dietary, accessibility, and special-request details.
7. Review the restaurant's booking policy.
8. Submit the reservation.
9. Receive an on-screen booking confirmation.

The system will check availability before confirming a booking and prevent conflicting reservations.

### C. Internal reservation application

The restaurant team will use the internal application to:

- View the service day's reservations.
- Search for guests and bookings.
- Create reservations on behalf of guests.
- Edit booking details.
- Check guests in.
- Mark guests as seated.
- Complete reservations.
- Cancel reservations.
- Record no-shows.
- View relevant guest history and service notes.

The interface will be a responsive web application designed for front-of-house use on a tablet or desktop computer. No native mobile application is included in this scope.

### D. Lightweight guest history

The system will retain useful operational information such as:

- Guest name and contact details.
- Previous reservations.
- Visit count.
- Cancellation and no-show history.
- Seating preferences.
- Occasion history.
- Dietary and allergy information.
- Accessibility requirements.
- Internal service notes.

This is a practical guest-history feature, not a complete 360-degree marketing CRM.

---

## 3. User Roles

The application will have two user levels.

### Super Admin

Super Admin users can:

- View and manage all reservations.
- Search and manage guest history.
- Configure opening hours.
- Configure bookable time slots.
- Configure seating areas and capacity.
- Manage Host accounts.
- Configure the post-visit feedback form (question title, subtitle, standout tags) and WhatsApp message template.
- Review feedback-link activity, response history, and detailed feedback submissions (rating, standout tags, comments, linked reservation, and guest context).
- Export operational data.
- View operational reports.
- Review system activity and audit history.

### Host

Host users are front-line restaurant users. They can:

- View today's reservations.
- Search guests and bookings.
- Create and edit reservations.
- View relevant guest history.
- Review dietary, allergy, accessibility, and service notes.
- Mark guests as arrived, seated, completed, cancelled, or no-show.

Host users will not have access to system configuration, user management, exports, or administrative controls.

---

## 4. Reservation Status Flow

Reservations will use the following operational statuses:

```text
Pending -> Confirmed -> Arrived -> Seated -> Completed
    |          |          |
    v          v          v
Cancelled   Cancelled   No-show
```

### Status meaning

- **Pending:** The reservation is waiting for a required condition, such as deposit confirmation or manual approval.
- **Confirmed:** The reservation has been accepted and capacity is reserved.
- **Arrived:** The guest has arrived at the restaurant.
- **Seated:** The guest has been seated.
- **Completed:** The visit has finished.
- **Cancelled:** The reservation will not be served.
- **No-show:** The guest did not arrive and did not cancel beforehand.

The system will preserve status history so GIOI can review what happened to each reservation.

---

## 5. Reservation Rules

The first release will support configurable rules for:

- Opening hours.
- Closed dates.
- Available booking intervals.
- Party-size limits.
- Seating-area capacity.
- Booking lead time.
- Booking cut-off time.
- Optional deposit requirements.
- Optional minimum-spend policies.
- Cancellation and no-show policies.

The initial implementation will use configurable seating-area capacity. A detailed visual table map will only be included if GIOI's operating model requires it.

This avoids building a complex table-management system before the actual floor rules are confirmed.

---

## 6. Guest Information Captured

The reservation flow may capture:

- Full name.
- WhatsApp or mobile number.
- Email address, if provided.
- Country or city, if useful.
- Party size.
- Date and time.
- Seating area preference.
- Occasion.
- Dietary restrictions and allergies.
- Accessibility requirements.
- Special requests.
- Marketing consent, separately from reservation consent.

Allergy and accessibility information will be clearly visible to authenticated restaurant users. It will not be exposed through public booking links.

---

## 7. Historical Data Migration

If data can be exported from Chope or existing spreadsheets, the project may include a controlled import process.

The import process will:

1. Normalize phone numbers where possible.
2. Validate required fields.
3. Identify probable duplicate guests.
4. Show invalid and duplicate records before import.
5. Require Super Admin approval before final import.
6. Preserve the source and import date.

Paper records can only be imported if they are supplied in a structured digital format. Manual transcription of an unlimited paper archive is not included unless separately agreed.

No guest record will be silently overwritten or merged.

---

## 8. Notifications and Payments

### Notifications

Automated WhatsApp and email messaging are not the core dependency of the first reservation workflow.

The reservation system will be designed so messaging can be added without replacing the reservation system.

If messaging is included in the implementation phase, the recommended approach is:

- Use a third-party WhatsApp provider for the first production version.
- Use a transactional email provider for email delivery.
- Start with reservation confirmations, reminders, cancellation confirmations, and deposit confirmations.
- Keep a manual Host confirmation fallback.
- Do not include marketing broadcasts or chatbot booking in the initial release.

Provider subscriptions, message charges, payment-processing fees, and other third-party charges are separate operating costs unless explicitly included in the commercial proposal.

### Deposits and payments

Deposit payments are optional and depend on GIOI's business rules and selected payment provider.

If enabled, the system will:

- Create a pending reservation when payment is required.
- Receive payment status from the payment provider.
- Confirm the reservation when the configured payment condition is met.
- Store the payment reference and status.

The payment provider's own fees, refunds, settlement rules, and account approval requirements are outside the application development fee unless stated separately.

---

## 9. Business Intelligence Dashboard (First Release)

The Admin dashboard must turn the current reservation, guest, status-history, seating-area, source, occasion, and settings data into operational decisions. It must support a date-range filter and show the data timezone and last-updated time.

### Dashboard views

| View | Metrics available from the current database | Decision supported |
|---|---|---|
| **Today live** | Bookings, expected covers, arrived/seated/completed covers, remaining capacity, no-shows, cancellations, occupancy against configured bookable capacity | Staffing, walk-in acceptance, late-guest follow-up |
| **Demand outlook** | Covers and bookings for the next 7 and 30 days, fill percentage by day, busiest time slots, demand by seating area | Staffing, purchasing, opening/closing slots, seating allocation |
| **Guest relationship** | First-time and repeat guests, repeat share, visit count, occasion mix, party-size mix, country/city where present, dietary/accessibility alerts for upcoming visits | Welcome-back service, occasion preparation, guest safety |
| **Channel performance** | Bookings, covers, and booking share by recorded source: website, Instagram, Google, WhatsApp, walk-in, phone, or Host | Compare channel usage and direct-booking adoption |
| **Reliability** | No-show count/rate, cancellation count/rate, rates by day/time/source, average booking lead time, status progression | Deposit, reminder, confirmation, and cancellation-policy decisions |
| **Operations and configuration** | Bookable capacity by seating area, slot load, closed dates, booking-window rules, configuration changes, status/audit activity | Capacity and policy changes with traceability |

### Required filters and drill-downs

- Date range, with presets for today, last 7 days, last 30 days, and custom range.
- Reservation status, source, seating area, time slot, and occasion.
- Every metric must drill into the reservations that form its denominator or total.
- Sensitive guest details, allergies, accessibility needs, phone numbers, and internal notes are visible only to authorized Admin/Host users; they must not appear in aggregate exports by default.

### Metric rules

- **Expected covers** include pending, confirmed, arrived, seated, and completed reservations; cancelled and no-show reservations are excluded.
- **Realised visits** use arrived, seated, and completed reservations. No-show and cancellation rates must show their denominator and date range.
- **Repeat guest** means a guest with more than one realised visit in the available reservation history; retention is not a cohort or lifetime-value calculation.
- **Capacity fill** uses configured bookable seating-area capacity. It is an operational planning measure, not actual table occupancy.
- **Channel performance** uses the reservation's recorded `source`; it does not claim advertising attribution or revenue.
- All date/time calculations use the restaurant timezone.

### Action cues

The dashboard should highlight a slot above the configured capacity threshold, no-show or cancellation rates above target, a repeat guest with allergy notes arriving today, and unusually concentrated demand by day, slot, area, or source.

### Data boundaries

The current database does not contain revenue, spend, menu-item, POS, staff-productivity, advertising-cost, or conversion data. Native feedback responses collected via the GIOI feedback page are captured and included in scope; Super Admin can inspect feedback response details (rating, standout tags, written comments, submission timestamp, and linked booking/guest profile) via the dashboard drill-down modal and within the guest's visit history. Feedback-link sent/open activity and response history are tracked for records stored by the application.

---

## 10. Explicitly Out of Scope for the First Release

The following items are not included in the first release unless separately approved and estimated:

- POS integration.
- Kitchen Display System integration.
- Full omnichannel inbox for WhatsApp, Instagram, and other channels.
- Automated marketing campaigns.
- Loyalty or membership program.
- Predictive demand planning.
- Customer lifetime value calculation.
- RFM segmentation.
- Automated VIP classification.
- Automated review and reputation engine.
- Automated post-dining feedback campaigns.
- Full chatbot booking through WhatsApp.
- Complex visual table-map management.
- Revenue or spend analytics without a connected sales data source.
- Unlimited paper-record digitization.
- Multi-restaurant or multi-brand management unless separately specified.

These are possible future phases, not launch commitments.

---

## 11. Future Expansion Path

After the reservation system has collected reliable data, GIOI may choose to add:

### Phase 2 — Communication automation

- WhatsApp confirmations and reminders.
- Email confirmations and receipts.
- Reschedule and cancellation links.
- Provider delivery logs.
- Deposit and payment notifications.
- **Post-visit feedback action:** after a reservation is marked `Completed`, the authorized staff user can click a button that opens WhatsApp with a prefilled message containing the GIOI-managed feedback-form link.
- GIOI builds and maintains the feedback form itself. Super Admin can configure the feedback question/title, subtitle, standout tags, and WhatsApp message template directly in Admin Settings, and review feedback-link logs/history against the related reservation and guest where consent permits.

Feedback collection must not automatically enroll a guest in marketing or loyalty communications. Those actions require separate explicit consent.
### Phase 3 — Operational intelligence

- Cohort and retention reports.
- Occupancy analysis.
- Scheduled management summaries.

### Phase 4 — Customer intelligence

- RFM segmentation.
- Customer lifetime value.
- Re-engagement audiences.
- Campaign conversion tracking.
- Personalized guest programs.
- Loyalty enrollment based on guest consent and feedback or visit history.
- Loyalty or re-engagement actions based on explicit communication consent.

Each future phase should be assessed against actual GIOI data quality and operational priorities rather than assumed in the first build.

---

## 12. Expected First-Release Outcome

The first release will be considered successful when:

- Guests can make direct reservations from the GIOI Bali landing page.
- The system prevents unavailable or conflicting bookings.
- Hosts can operate a complete service day from the internal application.
- Super Admin can manage booking rules and users.
- Returning guests can be identified through their reservation history.
- Important dietary and service notes are available to authorized staff.
- Reservation changes and status history are traceable.
- GIOI can export its operational data.
- Managers can see today's covers, no-shows, cancellations, guest mix, and booking source live on the dashboard.
- Direct bookings are accepted 24/7 without staff intervention.
- The system remains usable when an external messaging or payment provider is unavailable.
- GIOI has a reliable data foundation for later analytics and customer intelligence.

---

## 13. Client Decisions Required Before Implementation

Before implementation begins, GIOI should confirm:

1. Opening hours and closed dates.
2. Seating areas and capacity rules.
3. Booking intervals and maximum party sizes.
4. Booking lead time and cut-off policy.
5. Cancellation and no-show policy.
6. Whether deposits are required.
7. Which payment provider should be used, if applicable.
8. Whether WhatsApp or email automation is required for the first launch.
9. The native feedback questions, WhatsApp message template, and which authorized staff may send the feedback request after completed visits.
10. Available Chope or spreadsheet data for migration.
11. GIOI staff members who will use the Host and Super Admin accounts.

These decisions determine the final implementation estimate and prevent assumptions from becoming unplanned scope.

---

## 14. Scope Confirmation

This document supersedes the broader feature assumptions in `detailed_crm_platform_proposal_specification.md` for the first release.

The agreed direction is:

> **A GIOI-owned direct reservation platform with a public GIOI Bali landing page, a two-role internal operations application, lightweight guest history, and a real-time manager dashboard. Advanced CRM, messaging automation, payments, analytics, and marketing capabilities are optional later phases unless separately approved.**
