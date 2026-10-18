# GIOI Ocean Gourmet: UI/UX Design Spec

**Status:** Delivered & Verified Prototype Specification (v1.0)
**Method:** `taste-skill` (anti-slop frontend) applied to guest-facing surfaces; high-density operational UI for host and admin surfaces.
**Inputs:** `prototype/` (implemented codebase), `docs/gioi_reservation_platform_design.md`, `docs/gioi_prototype_usecase_scenarios.md`, `docs/gioi_client_scope_and_delivery.md`, verified GIOI brand assets.

---

## 0. Design Read

> Delivered as a **direct-booking platform and operational system for GIOI Ocean Gourmet**, a beachfront Asian-fusion venue at Discovery Shopping Mall in Kuta, Bali. Built for **mobile-first diners and tourists booking on coastal mobile data**, paired with a **touch-optimized operational tablet surface for hosts** and a **dense managerial dashboard**. Leans on **Vue 3.5 + Tailwind v3 + GSAP kinetic typography + View Transitions API + Phosphor Icons + authentic venue photography**.

### Brand Facts (Verified)

| Fact | Value | Design Use |
|---|---|---|
| Name | GIOI Ocean Gourmet | Ocean informs cool palette; Gourmet dictates typographic restraint |
| Location | Ground Floor Beach Front, Discovery Mall Bali, Jl. Kartika Plaza, Kuta | Prominent location metadata, Google Maps directions deep link |
| Hours | **Daily 10:00-22:00 WITA** | Live digital WITA clock on landing page; slot picker bounds; operational timeline |
| Cuisine | Asian fusion, farm-to-table, fresh coastal seafood | Copy tone, photography selection, dietary alerts |
| Signatures | GIOI Signature Crispy Duck, Crying Tiger, Grilled Giant River Prawn | Experience timeline and marketing copy |
| Logo Asset | Official circle asset (`public/logo.jpg`), navy background, serif "GIOI", script "Ocean Gourmet" | Header branding, metadata favicon, dark hero identity |
| Brand Colors | GIOI Navy (`#1F4A6B`), Sand (`#D6C4A3`), Sunset Orange (`#E87A3A`), Deep Navy (`#102638`) | Full-token palette across light and dark themes |
| Contact | WhatsApp & Phone: `+62 811 3960 6101` | Direct WhatsApp escalation for large parties and automated guest feedback links |
| Positioning | "The Most Beautiful Sunsets Dining in Kuta" | Sunset slot grouping (17:00-19:00 WITA) highlighted with sun indicator and approx. 18:15 sunset timing |
| Voice | Casual, warm, coastal, direct questions, zero corporate jargon | Headlines, helper text, empty states, confirmation copy |

### Core Objectives Served

- **Replace third-party marketplace dependencies (Chope):** Provides direct direct-booking with 30-second mobile completion, quick-book hero strip, and instant tabular booking codes.
- **Fast service-day FOH operations:** Replaces chaotic paper/chat coordination with a 1-tap status transition tablet host UI, capacity-checked walk-in entry, and fast guest search.
- **Post-visit guest feedback loop:** Direct WhatsApp feedback dispatches with dynamic questions and 1-5 star guest feedback capture.
- **Managerial oversight:** Real-time occupancy tracking, 7-day cover bars, 30-day sparkline forecasting, channel performance, and reliability metrics.

---

## 1. Surfaces and Dials

| Surface | Route | Skill Scope | VARIANCE | MOTION | DENSITY | Primary Job |
|---|---|---|---|---|---|---|
| Landing | `/` | taste-skill full | 7 | 5 | 3 | Convert visitors to diners in < 30s |
| Booking Flow | `/book` | taste-skill form | 4 | 3 | 4 | Fast, progressive 3-step table reservation |
| Confirmation | `/confirmation/:code` | taste-skill | 5 | 4 | 3 | Immediate proof, calendar .ics export, directions |
| Feedback | `/feedback/:code` | taste-skill | 5 | 3 | 3 | Post-visit 1-5 star rating and standout tags |
| Login | `/login` | operational | 2 | 2 | 4 | Fast role-switching (Host / Admin) |
| Host (Tablet) | `/host` | operational | 2 | 2 | 7 | Service-day timeline, status advancement, walk-ins |
| Guest Profile | `/guests/:id` | operational | 2 | 2 | 6 | Guest visit history, allergy flags, past ratings |
| Admin Dashboard | `/admin/dashboard` | operational | 3 | 2 | 6 | Operational analytics, action cues, period filters |
| Admin Settings | `/admin/settings` | operational | 2 | 2 | 6 | Hours, closed dates, areas, feedback templates |
| Admin Audit | `/admin/audit` | operational | 2 | 2 | 7 | Immutable event audit trail |

---

## 2. Implemented Architecture & UI/UX Audit

| Area | Implementation in `prototype/` | Status |
|---|---|---|
| **Stack** | Vue 3.5.13, Pinia 2.2.4, Vue Router 4.4.5, Tailwind 3.4.16, Vite 6.0.3, TypeScript 5.7.2 | **Delivered** |
| **Motion & Animation** | GSAP 3.15 + ScrollTrigger (hero entrance, word reveals, parallax media), CSS View Transitions (`::view-transition`), CSS keyframe rise | **Delivered** |
| **Icons** | Phosphor Icons (`@phosphor-icons/vue` 2.2.1) throughout (20px UI / 24px Host) | **Delivered** |
| **Testing** | Vitest 2.1.8 with 44 unit/domain tests covering analytics, availability, status transitions, and feedback | **Delivered** |
| **Palette** | Ocean Navy, Sea Salt, Brand Sand, and Sunset Orange CSS variables (`--surface`, `--accent`, `--brand-sun`, etc.) | **Delivered** |
| **Display Font** | **Cabinet Grotesk** (700, 800) self-hosted / Fontshare CDN with `display=optional` | **Delivered** |
| **Body / UI Font** | **Satoshi** (400, 500, 700) with tabular numbers for booking codes, dates, and times | **Delivered** |
| **Status Scale** | Single-accent progression in `status.ts` + neutral and danger variants; paired with Phosphor icons | **Delivered** |
| **Radius Scale** | Strict 3-tier geometry: 12px inputs (`rounded-input`), 16px cards/surfaces (`rounded-surface`), full pill for actions (`rounded-full`) | **Delivered** |
| **Dark Mode** | Token-based dark mode (`data-theme="dark"` on `:root`), 300ms smooth transition, auto-detected OS preference for public routes, dark default for Host/Admin, floating switcher | **Delivered** |

---

## 3. Design Tokens

### 3.1 Palette (CSS Variable Architecture)

All tokens are defined in `src/style.css` using RGB triplets to allow Tailwind opacity modifiers (`rgb(var(--token) / <alpha>)`).

| Token | Light (RGB / Hex) | Dark (RGB / Hex) | Functional Role |
|---|---|---|---|
| `--surface` | `243 245 244` (`#F3F5F4`) | `11 26 31` (`#0B1A1F`) | Page background (cool sea-salt off-white) |
| `--surface-raised` | `251 252 252` (`#FBFCFC`) | `18 37 43` (`#12252B`) | Cards, sheets, popovers, form panels |
| `--ink` | `19 47 69` (`#132F45`) | `230 238 242` (`#E6EEF2`) | Primary headlines, strong labels, dark text |
| `--ink-muted` | `74 98 106` (`#4A626A`) | `157 179 185` (`#9DB3B9`) | Secondary copy, captions, inactive icons (AA on surface) |
| `--line` | `213 222 223` (`#D5DEDF`) | `35 57 63` (`#23393F`) | Subtle borders, table dividers, input borders |
| `--accent` | `31 74 107` (`#1F4A6B`) | `127 168 201` (`#7FA8C9`) | Primary actions, active navigation, focus rings |
| `--accent-hover` | `25 61 89` (`#193D59`) | `152 188 217` (`#98BCD9`) | Hover state for accent buttons |
| `--accent-ink` | `244 239 230` (`#F4EFE6`) | `11 26 38` (`#0B1A26`) | High-contrast text on accent backgrounds |
| `--brand-sand` | `214 196 163` (`#D6C4A3`) | `214 196 163` (`#D6C4A3`) | Secondary hero badges, brand highlights, party size chart |
| `--brand-sun` | `232 122 58` (`#E87A3A`) | `232 122 58` (`#E87A3A`) | Sunset indicators, primary landing CTAs, occasion charts, hero accents |
| `--brand-navy` | `16 38 56` (`#102638`) | `16 38 56` (`#102638`) | Full-bleed hero container, footer surface, time tags |
| `--danger` | `179 38 30` (`#B3261E`) | `242 184 181` (`#F2B8B5`) | Destructive actions, allergy alerts, over-capacity warnings |

#### Token Rules
1. **Accent hierarchy:** GIOI Navy (`--accent`) drives interaction and state selection on booking, host, and admin tools. Sunset Orange (`--brand-sun`) is reserved for sunset highlights, hero callouts, and chart accents.
2. **Elevated contrast:** Text on buttons and chips strictly meets WCAG 2.1 AA standards across light and dark modes.
3. **Soft elevation:** Shadows use `boxShadow.soft` (`0 1px 2px rgb(var(--ink) / 0.06), 0 8px 24px -8px rgb(var(--ink) / 0.10)`), tinted with the ink token rather than raw black.

### 3.2 Typography

| Role | Font Family | Weights | Usage & Characteristics |
|---|---|---|---|
| **Display** | Cabinet Grotesk | 700 (Bold), 800 (Extrabold) | Hero titles, section headers, modal titles. Leading `[0.98]` to `[1.05]`, `tracking-[-0.035em]`. |
| **Sans / Body** | Satoshi | 400 (Regular), 500 (Medium), 700 (Bold) | Form inputs, button labels, operational tables, body paragraphs. |
| **Tabular Numbers** | Satoshi (tabular) | 500, 700 | Booking codes, clock timestamps, covers counters, slot times. |

### 3.3 Shape & Elevation Scale

- **Inputs (`rounded-input`):** `12px` border radius (`field`, `DatePicker` trigger, search bars).
- **Cards & Surfaces (`rounded-surface`):** `16px` border radius (`card`, modals, calendar popovers, timeline images).
- **Interactive Controls (`rounded-full`):** Full pill shape (`btn`, `btn-primary`, `pill`, `chip`, status badges).

---

## 4. Landing Page `/`

**Primary Job:** Transform an Instagram or Google Maps discovery into a confirmed table reservation in under 30 seconds.

### 4.1 Navigation
- Fixed header with GIOI logo (`/logo.jpg`), anchor navigation (`#experience`, `#visit`), and primary `Reserve a table` pill in sand.
- Floating theme switch button bottom-right (smooth rotating `PhSun` / `PhMoon` icon).

### 4.2 Hero: Asymmetric Kinetic Split
- Container in `--brand-navy` (`#102638`) with white typography.
- Eyebrow badge: `PhSunHorizon` icon + "Beachfront dining in Kuta".
- Headline: 3-line kinetic typography with GSAP staggered entrance: *"Fresh from the coast. Made for sunset."* (with "Made for sunset." styled in `--brand-sun`).
- Subtext: *"A beachfront restaurant for seafood, modern Asian flavours and long afternoons beside Kuta Beach."* (max 42ch).
- **Inline Quick-Book Bar:** Compact frosted pill on desktop/mobile:
  - DatePicker component (defaults to today).
  - Party size dropdown (1 to 8 guests).
  - "Find a table" action button (`bg-sun text-navy`), deep-linking directly to `/book?date=...&party=...`.
- Right Media: Full-bleed coastal photography (`GIOI-OG_Gallery-image-outlet-06.webp`) with GSAP `clipPath` reveal and scroll parallax scrub.

### 4.3 Experience Timeline (`#experience`)
- Section Header: *"From first light to last call"*, headline *"Come for the view. Stay for the flavour."*
- 3-column chronological cards:
  1. `10:00` — **A slower start:** Coffee, fresh fruit, and morning views of Kuta Beach.
  2. `17:30` — **The front row:** Elevated center card (`md:-translate-y-12`), seafood, sharing plates, sunset light.
  3. `20:00` — **Stay for dinner:** Grilled coastal produce, Asian cocktails, fairy-lit dinner lounge.
- Floating time badges set in `bg-navy/85 text-sand` with backdrop blur; smooth image hover zoom (`scale-[1.03]`).

### 4.4 Visit & Practical Information (`#visit`)
- Left Column:
  - Eyebrow *"Find us"*, headline *"On the beach at Discovery Mall."*
  - **Live WITA Clock:** Real-time digital clock bound to `Asia/Makassar` time zone.
  - Venue address with `PhMapPin` and Google Maps deep link.
  - Weekly opening hours schedule (highlighting current day status: "Open today until 22:00").
  - Direct WhatsApp (`+62 811 3960 6101`) and phone contact links.
- Right Column:
  - Wide venue photograph (`GIOI-OG_Gallery-image-outlet-03.webp`) with venue features list (valet parking, beach access, sunset terrace).

### 4.5 Closing CTA & Footer
- Dramatic full-bleed navy banner: *"Make sunset your reservation."* with "reservation." in `--brand-sun`.
- Primary CTA: "Reserve a table" (`bg-sun`) + secondary WhatsApp inquiry link.
- Footer: Copyright, address recap, and low-emphasis Staff Login (`/login`) link.

---

## 5. Booking Flow `/book`

**Primary Job:** One-page, progressive disclosure booking flow with zero wizard page reloads and instant validation.

### 5.1 Step 1: When
- **14-Day Date Strip:** Horizontal snap-scrolling date pills showing day name and day number; closed days disabled.
- **Custom DatePicker:** "More dates" trigger opening an accessible dropdown calendar (`DatePicker.vue`) with month navigation, disabled closed dates, and keyboard navigation.
- **Party Stepper:** Accessible `[ - ]` and `[ + ]` pill buttons (`PhMinus`, `PhPlus`) bounded between 1 and 8 covers. Over 8 covers prompts an inline WhatsApp booking link.
- **Seating Area Selection:** Pills for bookable areas ("Anywhere", "Main Hall", "Sunset Terrace", "Beachfront Lounge", "Chef's Counter").
- **Meal Period Slot Grid (`AvailabilityGrid.vue`):** Slots categorized into 4 meal periods:
  - *Lunch* (10:00 - 14:00)
  - *Afternoon* (14:00 - 17:00)
  - *Sunset* (17:00 - 19:00, marked with `PhSunHorizon` and "Sun goes down around 18:15" hint)
  - *Dinner* (19:00 - close)
- Slot chips indicate capacity constraints: available, selected, "2 left", "Full", "Closed", or "Too soon".

### 5.2 Step 2: Who
- Required fields: Full name and WhatsApp / phone (defaulting to international format placeholder).
- Optional fields: Email and Country / city (to tailor service for Australian/international visitors).

### 5.3 Step 3: Details (Accordion Disclosure)
- Collapsible section with dynamic badge counter (e.g. `2 added`).
- **Occasions:** Birthday, Anniversary, Business dinner, Date night, Celebration pills.
- **Dietary & Allergies:** Multi-select pills (Vegetarian, Vegan, Halal, Gluten-free, Nut allergy, Shellfish allergy) + custom text input. Note confirms: *"Seen by our kitchen team only."*
- **Accessibility:** Text input for mobility requirements (ground floor, wheelchair access).
- **Special Requests:** Textarea with 300-character countdown counter.

### 5.4 Summary & Confirmation Action
- **Cancellation Policy:** Clearly displayed inline: *"Please cancel or reschedule at least 4 hours before your booking..."* with required acknowledgment checkbox.
- **Marketing Consent:** Optional opt-in checkbox.
- **Missing Step Helper:** Dynamic validation badge above CTA explaining exact missing requirement (e.g. *"Pick a time slot"*, *"Enter full name & phone"*, *"Accept cancellation policy"*).
- **Desktop Sidebar:** Sticky card displaying formatted date, party count, selected time, seating area, missing step cue, and submit button.
- **Mobile Bottom Bar:** Fixed frosted bar with summary string (`Sat 12 Oct · 18:30 · 2 guests`), missing step indicator, and full-width CTA.
- **Conflict Handling:** Submitting an expired/filled slot immediately highlights nearest alternatives and scrolls smoothly back to the slot picker.

---

## 6. Confirmation & Post-Visit Surfaces

### 6.1 Confirmation `/confirmation/:code`
- Header: `PhCheckCircle` icon + *"See you soon. We've held your table."*
- Prominent booking code in tabular numerals with 1-click clipboard copy button and feedback indicator.
- Reservation details card: Date, time, party size, seating area, special requests, and current `StatusChip`.
- Action buttons:
  - **Add to calendar:** Generates client-side `.ics` calendar file for Apple Calendar / Google Calendar.
  - **Get directions:** Direct Google Maps navigation link.
  - **Message us:** WhatsApp deep link referencing the booking.

### 6.2 Guest Feedback `/feedback/:code`
- Accessible only for reservations in `completed` status; invalid codes display a polite fallback card.
- Dynamic title and subtitle sourced from Admin Settings.
- 1 to 5 star rating widget using interactive `PhStar` icons.
- Standout service tag chips (dynamically configured, e.g. Food, Service, Atmosphere, Value).
- Comments textarea (1,000 characters maximum).
- Submitting writes an immutable entry to the audit log and attaches feedback to the guest record.

---

## 7. Host Tablet Surface `/host`, `/guests/:id`

**Primary Job:** Front-of-house operations on 1024px–1366px tablets in dim dining rooms. Zero clutter, 48px touch targets, 1-tap state advancement.

### 7.1 Service Header & Service Day Controls
- Service Day title with live booking count and active covers count.
- Date navigation buttons: `Previous`, `Today`, `Next`, and native date picker.
- Primary `+ Walk-in` button triggering `WalkInModal.vue`.
- Walk-in modal validates table availability, capacity limits, party size, and guest contact before insertion.

### 7.2 Service List & Tabs
- Dual tab switch: **Today's Bookings** vs **Guest Search**.
- **Guest Search Tab (`GuestSearch.vue`):** Instant search across names, phone numbers, and emails. Displays visit counts, allergy warnings (`PhWarning`), accessibility cues (`PhWheelchair`), and repeat guest chips (`PhStar`).
- **Service Timeline Rows:**
  - Time, party size, guest name, and assigned area.
  - Allergy alert badges highlighted in `--danger`.
  - Repeat visitor badges (`Repeat · N visits`).
  - **Single Forward Action Button (`StatusButtons.vue`):** Displays only the next logical status transition (Confirmed → Arrived → Seated → Completed).
  - Destructive transitions (Cancelled, No-show) require an inline two-step confirmation (`Mark as No-show? Yes / Keep booking`).
  - Completed reservations feature a 1-tap **Send feedback** action that launches WhatsApp with a prefilled feedback link.
  - Tapping a row opens the full Guest Profile `/guests/:id`.

### 7.3 Status Design Scale

Implemented in `src/domain/status.ts` and rendered via `StatusChip.vue`:

| Status | Visual Treatment | Icon | Meaning |
|---|---|---|---|
| `pending` | Outline, text `--ink-muted`, border `--line` | `PhHourglass` | Deposit or manual verification pending |
| `confirmed` | Outline, text `--accent`, border `--accent` | `PhCheckCircle` | Confirmed upcoming reservation |
| `arrived` | 20% accent tint background, text `--accent` | `PhDoorOpen` | Guest is at the host stand |
| `seated` | Solid accent background, text `--accent-ink` | `PhArmchair` | Guest is at their table |
| `completed` | Neutral background `--line`, text `--ink` | `PhCheck` | Meal finished, bill settled |
| `cancelled` | Outline `--danger`, text `--danger` | `PhXCircle` | Cancelled by guest or host |
| `no_show` | 15% danger fill, text `--danger` | `PhUserMinus` | Guest failed to arrive |

### 7.4 Guest Profile View `/guests/:id`
- Full guest profile header with contact details, creation date, and marketing consent status.
- Summary metrics: completed visits, cancellations, and no-show count.
- Prominent allergy and dietary alert callouts.
- Complete chronological visit history with status history logs, seating areas, past special requests, and feedback ratings.

---

## 8. Admin Surfaces `/admin/*`

### 8.1 Manager Dashboard `/admin/dashboard`
- **Filter Controls:** Preset selector (Today, Last 7 days, Last 30 days, Custom date range) combined with status, source channel (Direct Web, WhatsApp, Chope, Walk-in), seating area, and occasion filters.
- **Action Cues:** Automated operational alerts:
  - *Slot over capacity:* Alert when a slot exceeds 85% capacity threshold.
  - *No-show rate high:* Warning when rate exceeds the 8% target.
  - *Repeat guest with allergy today:* Highlighted for kitchen prep.
  - Each cue includes direct deep links to Host view or Guest profile.
- **Live Metrics (Today):** Bookings, expected covers, arrived/seated/completed counts, no-show/cancellation counts, and real-time visual capacity bar.
- **Analytics Visualizations:**
  - *Next 7 Days Covers:* Custom `BarChart.vue` component with busiest slot callout.
  - *Next 30 Days Forecast:* SVG `Sparkline.vue` curve with milestone calendar ticks.
  - *Guest Mix:* Total guests, first-timers vs repeats, retention rate %, occasion distribution bar chart, party size distribution bar chart.
  - *Channel Share:* Percentage split across booking sources.
  - *Reliability:* Realised covers, average lead time, cancellation rate, and no-show trend sparkline.
- **Guest Feedback Section:** Average rating, total responses, 1–5 star distribution bar chart, standout tags ranking, and recent response modal inspection.
- **Reservations Table:** Searchable, filterable operational table with CSV export.

### 8.2 Admin Settings `/admin/settings`
- **Hours & Rules:** Opening and closing hours per day of the week, closed dates calendar manager.
- **Service Rules:** Booking intervals (30m), party size bounds (1–8), lead time thresholds, and target no-show percentages.
- **Seating Areas:** Table and area editor (capacity limits, bookability toggles, minimum/maximum party size restrictions).
- **Feedback Configuration:** Editable feedback title, subtitle, customizable standout tags list, and WhatsApp feedback invitation template with token placeholders (`{{guestName}}`, `{{restaurantName}}`, `{{feedbackUrl}}`).
- **Policy Management:** Inline editor for cancellation policies.
- **User Management:** Staff accounts and role assignments (`HOST`, `ADMIN`, `SUPER_ADMIN`).

### 8.3 Admin Audit `/admin/audit`
- Searchable and filterable table documenting system actions with timestamp, actor name, action verb, target entity, and detailed metadata notes.

---

## 9. Content and Assets Status

| Asset | Status | Usage in Prototype |
|---|---|---|
| **Logo** | Integrated (`public/logo.jpg`) | Official GIOI circular brand mark on header, favicon, and dark hero |
| **Opening Hours** | Verified | Configured in `settings.json` as 10:00 - 22:00 WITA daily |
| **Photography** | Integrated | Authentic GIOI Group outlet gallery webp images for hero, scenes, and visit sections |
| **Typography** | Integrated | Fontshare Cabinet Grotesk (700, 800) + Satoshi (400, 500, 700) |
| **Seating Areas** | Configured | Main Hall (24), Sunset Terrace (14), Beachfront Lounge (16), Chef's Counter (6) |
| **Contact Data** | Configured | Phone & WhatsApp `+62 811 3960 6101`, Discovery Mall Bali map URL |

---

## 10. Quality Gates & Verification

- [x] **Zero em-dashes** in visible copy (hyphens, commas, or periods used throughout).
- [x] **Single-accent system** across booking and host states (GIOI Navy `--accent` with Sunset Orange `--brand-sun` highlights).
- [x] **3-tier radius rule** strictly maintained (`12px` input, `16px` surface, `full` pill).
- [x] **Clear CTA labels:** "Reserve a table" / "Find a table" on landing, "Confirm booking" on booking submission.
- [x] **Mobile responsive:** Sticky bottom summary bars, touch-friendly 48px+ targets, horizontal snap date scrolling.
- [x] **Accessible contrast:** Light and dark text ratios meet WCAG AA standards.
- [x] **Motion safety:** All GSAP timelines, CSS keyframes, and transitions honor `prefers-reduced-motion: reduce`.
- [x] **State coverage:** Empty states, slot conflict handling, and capacity overload cues verified.
- [x] **Verified test suite:** 44 Vitest tests passing across domain logic (availability, status transitions, analytics, feedback).

---

## 11. Implemented Architecture & Production Handoff Notes

### 11.1 Client Architecture
- **State Stores (Pinia):**
  - `data.ts`: Central hydration and persistence of reservations, guests, settings, users, and audit logs.
  - `reservations.ts`: Reservation creation, validation, and status transitions.
  - `settings.ts`: Operational settings updates.
  - `auth.ts`: Session state and role-based route guards.
  - `export.ts`: Client-side CSV generation and download.
- **Domain Modules (`src/domain/`):** Pure TypeScript logic with zero UI coupling:
  - `availability.ts`: Slot generation, lead time calculation, capacity conflict checking.
  - `status.ts`: Valid status state machine and icon/chip styling mappings.
  - `analytics.ts`: Dashboard aggregation, date range resolution, action cues calculation.
  - `feedback.ts`: Feedback URL generation and WhatsApp template token substitution.
  - `dates.ts`: ISO date manipulation and WITA formatting helpers.

### 11.2 Production Handoff Checklist
1. **Backend Integration:** Replace Pinia `localStorage` stores with REST/GraphQL endpoints backed by PostgreSQL.
2. **Concurrency Control:** Maintain the prototype's slot-checking logic in transactional SQL queries with table/slot locking to prevent double bookings.
3. **Authentication:** Connect `/login` to real SSO or Auth0/Supabase with session cookies and role checks.
4. **WhatsApp Business API:** Replace `window.open(wa.me/...)` deep links with automated webhook dispatch via Meta WhatsApp Cloud API for confirmation and feedback messaging.
5. **Asset Hosting:** Self-host Cabinet Grotesk and Satoshi web fonts (`.woff2`) directly on the production CDN.
