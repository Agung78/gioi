# GIOI Bali Reservation Platform
## Product and Technical Design

**Client:** GIOI Bali Restaurant  
**Document status:** Approved scope design  
**Purpose:** Replace Chope for direct reservations and provide an internal reservation system with lightweight guest history.

---

## 1. Product Decision

GIOI should build a **reservation-first platform**, not a full CRM or marketing automation suite.

The first release has three surfaces:

1. **Public GIOI Bali landing page** — restaurant information and direct reservation entry point.
2. **Reservation flow** — replaces Chope for direct bookings, availability, capacity, and booking lifecycle.
3. **Internal operations CRM** — gives Super Admin and Host users access to reservations and customer history.

The platform is a responsive web-based system. It will run in modern desktop and mobile browsers, including restaurant tablets. Native iOS and Android applications are not included.

Data intelligence, advanced segmentation, automated marketing, and predictive analytics come after the system has collected reliable historical data.

### Goals

- Own GIOI's direct reservation data.
- Give hosts a fast, tablet-friendly service workflow.
- Preserve guest history between visits and shifts.
- Reduce dependency on Chope for direct bookings.
- Keep messaging and payment providers replaceable.

### Non-goals for the first release

- POS or KDS integration.
- Full omnichannel inbox.
- Loyalty program.
- Automated marketing campaigns.
- Predictive demand planning.
- Customer lifetime value and RFM intelligence.
- Complex VIP automation.
- Rebuilding WhatsApp or email delivery infrastructure.

---

## 2. Users and Permissions

There are exactly two application roles.

| Capability | Super Admin | Host |
|---|---:|---:|
| View today's reservations | Yes | Yes |
| Search guests and reservations | Yes | Yes |
| Create reservations | Yes | Yes |
| Edit operational booking details | Yes | Yes |
| Change reservation lifecycle status | Yes | Yes |
| View guest history | Yes | Yes |
| Add service notes | Yes | Yes |
| View sensitive administrative settings | Yes | No |
| Configure opening hours and capacity | Yes | No |
| Configure seating areas and booking rules | Yes | No |
| Manage users | Yes | No |
| Export data | Yes | No |
| View management reports | Yes | Limited operational view |
| Review audit log | Yes | No |

### Host design requirement

The Host interface must prioritize the current service day:

- Today's bookings first.
- Search by guest name, phone number, booking code, or time.
- One-tap actions for `Arrived`, `Seated`, `Completed`, `Cancelled`, and `No-show`.
- Allergy and accessibility alerts must be visually prominent.
- The Host interface is a responsive web application for tablet and desktop browsers; no native mobile application is included.

---

## 3. Core User Flows

### 3.1 Guest creates a reservation

```text
Landing page
  -> Select date, time, party size, seating area
  -> Enter contact and visit details
  -> Review policies and consent
  -> Optional deposit payment
  -> Reservation created
  -> Confirmation shown
  -> Optional confirmation notification
```

The system must check availability atomically before confirming the booking. A booking cannot be confirmed if it exceeds capacity or conflicts with the configured inventory rules.

### 3.2 Host manages a booking

```text
Today's service view
  -> Open reservation
  -> Review guest details, occasion, dietary and service notes
  -> Mark Arrived
  -> Mark Seated
  -> Mark Completed
```

The Host can also cancel, reschedule, or mark a reservation as no-show according to the configured operational permissions.

### 3.3 Super Admin manages configuration

```text
Admin settings
  -> Configure opening schedule
  -> Configure seating areas and capacity
  -> Configure booking windows and policies
  -> Review reservations and guest history
  -> Export or report on operational data
```

Configuration changes must be recorded in the audit log with actor, timestamp, changed fields, and previous/new values.

### 3.4 Existing data migration

Initial data may come from Chope exports, spreadsheets, and paper records. Imports must be treated as a separate controlled process:

1. Normalize phone numbers to E.164 where possible.
2. Validate required fields.
3. Detect probable duplicate guests.
4. Preview rejected and duplicate rows.
5. Require Super Admin confirmation before import.
6. Record import source and timestamp.

No silent merge or destructive overwrite is allowed during migration.

---

## 4. Reservation Lifecycle

The system uses these states:

```text
Pending -> Confirmed -> Arrived -> Seated -> Completed
    |          |          |
    v          v          v
Cancelled   Cancelled   No-show
```

### Rules

- `Pending` means the reservation is created but still requires a configured condition, such as deposit confirmation or Host approval.
- `Confirmed` means inventory is reserved for the guest.
- `Arrived` means the guest has checked in.
- `Seated` means the guest is assigned to a table or seating area.
- `Completed` means the visit is finished and may contribute to visit history.
- `Cancelled` means the booking will not be served.
- `No-show` means the guest did not arrive and the booking was not cancelled in advance.

The system must retain status history rather than only storing the current status. This enables accurate no-show, cancellation, and operational reporting.

### Availability model

Availability is determined by:

- Opening hours and closed dates.
- Bookable time intervals.
- Party-size rules.
- Seating-area capacity.
- Table or zone availability, if configured.
- Booking lead time and cutoff rules.
- Optional minimum spend or deposit policy.

Start with configurable seating-area capacity. Add detailed table topology only if GIOI's operation requires it; a table-map engine is unnecessary until the actual floor rules demand it.

---

## 5. Minimum Data Model

### Guest

- `id`
- Full name
- Normalized phone number
- Email, optional
- Country/city, optional
- Dietary restrictions and allergies
- Accessibility requirements
- Seating preferences
- Occasion history, derived from reservations
- Internal service notes
- Marketing consent status and timestamp
- Created/updated timestamps

### Reservation

- `id`
- Human-readable booking code
- Guest ID
- Reservation date and timezone
- Arrival time
- Party size
- Seating area
- Occasion
- Guest request notes
- Internal operational notes
- Source: website, Host, Chope import, phone, Instagram, walk-in, or other
- Status
- Deposit requirement and payment reference, if enabled
- Created by and updated by
- Created/updated timestamps

### Reservation status event

- Reservation ID
- Previous status
- New status
- Actor or system source
- Timestamp
- Optional reason

### Seating area

- Name
- Capacity
- Bookable/not bookable flag
- Opening schedule override, optional
- Minimum spend or deposit rule, optional

### User

- Name
- Login identifier
- Role: `SUPER_ADMIN` or `HOST`
- Active/inactive status
- Last login
- Created/updated timestamps

### Audit event

- Actor
- Action
- Entity type and ID
- Changed fields
- Timestamp
- Request or correlation ID, if available

Sensitive allergy and service information must be visible only to authenticated application users and must not be exposed in public booking URLs.

---

## 6. System Architecture

```text
[GIOI Landing Page]
          |
          v
[Public Reservation API] ---- [Payment Provider, optional]
          |
          v
[Reservation Application]
     |          |          |
     v          v          v
[Guest DB] [Availability] [Audit Log]
     |
     v
[Internal CRM / Host App]
     |
     v
[Notification Adapter]
     |                  |
     v                  v
[WhatsApp Provider] [Email Provider]
```

### Boundaries

- The **reservation application** owns booking truth, availability, guest history, roles, and audit records.
- The **landing page** is a public client of the reservation API; it must not write directly to the database.
- The **notification adapter** receives reservation events and delegates delivery to a provider.
- WhatsApp and email providers are delivery mechanisms, not systems of record.
- Payment providers report payment status; the reservation application decides whether that status permits confirmation.

A provider adapter prevents the reservation system from being coupled to WATI, Twilio, Meta, or a particular email vendor.

---

## 7. Messaging Decision

### Initial recommendation

Messaging should be optional for the first operational release. The reservation system must work with a manual Host confirmation fallback.

When automated messaging is enabled:

- Use a third-party WhatsApp provider for the first production version unless GIOI already has a team able to operate Meta Cloud API directly.
- Use a transactional email provider rather than building email delivery internally.
- Store notification intent, provider, status, error, and timestamps in the application.
- Do not store provider credentials in application data or source code.
- Treat provider callbacks as duplicate-prone and idempotently process them.

### WhatsApp scope

Start with transactional utility messages only:

1. Reservation confirmation.
2. Deposit confirmation, if applicable.
3. Reminder.
4. Cancellation or reschedule confirmation.

Do not add marketing broadcasts or chatbot booking until the basic reservation workflow has proven reliable.

Meta requires approved templates for messages outside an open customer-service window. Meta also charges delivered template messages according to template category and recipient country. The provider may add subscription or platform fees on top of Meta charges. Exact pricing must be checked against the current provider quote and Meta's current rate card before procurement.

### Email scope

Use email as a secondary transactional channel for confirmations, receipts, and admin summaries. It is not a prerequisite for the Host workflow.

---

## 8. Reliability, Security, and Privacy

- Enforce server-side authorization for every role-protected action.
- Normalize and validate phone numbers at intake.
- Prevent double booking with transactional availability checks.
- Make status updates and provider callbacks idempotent.
- Keep an immutable status history and audit trail.
- Back up reservation and guest data regularly.
- Provide export and deletion procedures for guest data.
- Record marketing consent separately from operational reservation consent.
- Avoid exposing allergy, phone, or internal-note data in public responses.
- Use HTTPS, secure session handling, password hashing, and rate limiting on public endpoints.
- Provide a manual fallback when payment, notification, or external provider services fail.

The system must never treat a failed notification as a failed reservation unless the business explicitly configures confirmation to depend on message delivery.

---

## 9. Reporting Roadmap

### Initial operational reporting

- Reservations by date and status.
- Expected covers.
- Completed covers.
- Cancellations and no-shows.
- Booking source.
- Average booking lead time.
- Guest visit count.

### Later data intelligence

Only after sufficient clean history exists:

- Repeat-guest rate and cohorts.
- Recency/frequency/spend segmentation.
- Customer lifetime value.
- Occupancy and booking-pace analysis.
- Re-engagement segments.
- Campaign conversion.


Reports must define their denominator and timezone. For example, no-show rate should distinguish reservations from covers and should exclude bookings that were cancelled before service.

### Future feedback and loyalty foundation

The first release does not include a feedback form or loyalty program. A later phase may add a post-visit feedback link, using a hosted form such as Google Forms or a dedicated GIOI feedback page.

The future feedback flow should associate the response with the relevant reservation and guest where consent permits:

```text
Completed reservation
  -> Feedback link
  -> Guest rating and comments
  -> Internal service-recovery review
  -> Optional loyalty or re-engagement action
```

The reservation system should retain the reservation code, guest identity, visit date, and communication-consent status needed to support that future integration. The choice between Google Forms, a native feedback page, and a loyalty platform will be made after GIOI has enough reservation volume and a clear loyalty strategy.

Feedback collection must not automatically imply marketing consent. Loyalty enrollment and promotional communication require separate, explicit consent.

---

## 10. Delivery Plan

### Phase 1 — Reservation replacement

- Confirm operational rules with GIOI.
- Build landing page and direct booking flow.
- Implement roles and authentication.
- Implement availability and reservation lifecycle.
- Implement Host daily service view.
- Implement Super Admin configuration and guest history.
- Import approved historical data.
- Pilot with real service staff.

### Phase 2 — Notifications and payments

- Select WhatsApp provider or direct Meta integration.
- Configure utility templates.
- Add email fallback.
- Add deposit integration if required.
- Add delivery and payment status logs.

### Phase 3 — Operational reports

- Add management reports.
- Validate metrics against daily operating records.
- Add exports and scheduled summaries if useful.

### Phase 4 — Data intelligence

- Reassess data quality and volume.
- Define business questions before adding segmentation or predictive features.
- Implement only metrics that support a specific operational decision.

The timeline should be estimated after confirming table/capacity rules, deposit policy, migration quality, authentication requirements, and the selected messaging/payment providers.

---

## 11. Acceptance Criteria

The first release is ready for pilot when:

- A guest can complete a direct reservation from the GIOI landing page.
- The system rejects unavailable slots without creating an inconsistent booking.
- A Host can manage a full service day from a tablet-sized screen.
- A Host can find a returning guest and view relevant history and alerts.
- A Super Admin can configure booking availability and manage users.
- Reservation status history and administrative changes are auditable.
- Imported historical records are reviewable and duplicate handling is explicit.
- The system remains usable when payment or messaging providers are unavailable.
- Operational data can be exported by Super Admin.
- No launch dependency exists on predictive analytics or marketing automation.

---

## 12. Research References

- [Meta WhatsApp pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
- [Meta WhatsApp webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview)
- [Meta WhatsApp message templates](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview)
- [WATI pricing](https://www.wati.io/pricing/)

Provider pricing, availability in Indonesia, onboarding requirements, and message rates must be verified through current vendor quotations before the implementation plan commits to a provider.
