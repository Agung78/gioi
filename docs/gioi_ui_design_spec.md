# GIOI Ocean Gourmet: UI/UX Design Spec

**Status:** Draft for review (design only, no code changes)
**Method:** `taste-skill` (anti-slop frontend), applied to guest-facing surfaces. Host/Admin surfaces use operational-UI rules (taste-skill Section 13 marks dashboards out of scope).
**Inputs:** `docs/gioi_reservation_platform_design.md`, `docs/gioi_client_scope_and_delivery.md`, current prototype (`prototype/`), public research (Chope listing, Glints company page).

---

## 0. Design Read

> Reading this as: **redesign (overhaul visuals, preserve IA and flows)** of a **direct-booking site for a beachfront Asian-fusion restaurant in Kuta, Bali**, for **tourists and local diners booking on mobile**, with a **premium-consumer, coastal, photo-led** language, leaning toward **Vue 3 + Tailwind v3 (existing stack) + CSS-driven motion + real food photography**.

### Brand facts (researched)
| Fact | Value | Design use |
|---|---|---|
| Name | GIOI Ocean Gourmet | "Ocean" drives palette; "Gourmet" drives restraint |
| Location | Discovery Shopping Mall, Jl. Kartika Plaza, Kuta, Bali (beachfront) | Place-focused venue: address + map are real content, not decoration |
| Hours | Instagram bio: **10:00-22:00**; Chope listing: 10:00-23:00 (**conflict, confirm with client**) | Slot picker bounds; lunch / sunset / dinner grouping |
| Founded | 2016, Sadeli brothers | One-line story section, no fake heritage copy |
| Cuisine | Asian fusion, farm-to-table | Menu highlights section |
| Signatures | GIOI Signature Crispy Duck, Crying Tiger (Thai-style Australian striploin), Grilled Giant River Prawn with prawn butter | Hero / highlight imagery |
| Rating (Chope) | 4.2 / 5 (46 reviews); Food 4.0, Service 4.1, Atmosphere 4.2 | Only real numbers allowed on page |
| Logo (Instagram) | Navy circle, "GIOI" in spaced serif caps (diacritic on the O) over "Ocean Gourmet" in a brush script with underline swash, set in sand/beige. Monogram "OG" used on story highlights | Logo is a brand asset: keep it as-is; UI type stays sans |
| Brand colors (observed) | Deep navy `~#1F4A6B`, sand `~#D6C4A3` from the logo; blue-and-white ikat textiles (cushions, staff shirts); sunset orange in photography | Palette (Section 3.1) |
| Positioning (bio) | "The Most Beautiful Sunsets Dining in Kuta." By GIOI GROUP. Discovery Mall Bali Beachfront. Linktree + Threads | Sunset is the hero promise; sunset slot is the product |
| Offering (feed) | Beach-club lounge (blue bean bags, fairy lights at night), coconuts and mocktails, pour-over coffee from 7:00 AM posts, pasta and Western dishes alongside Asian fusion, kids bounce-castle/play area, events (sunset yoga "Sunset Flow by the Sea" 99K, NYE 2026), deals | Booking needs area + event types; family-friendly signal |
| Voice | Playful, casual, English, direct questions ("What are you doing in Bali?", "You said: I'm bored") | Copy register: warm and casual, not fine-dining formal |
| Audience size | ~2.1k followers, 115 posts | Small brand: site must carry the brand, not rely on social proof |
| Unknown | Logo source files, official hex values, typeface names | **Must obtain from client** before build (see Section 9) |

### Business goal the UI must serve
- Replace Chope for direct bookings. The guest page must feel **more GIOI and less marketplace** than Chope, and be **faster to book** than WhatsApp.
- Capture occasion, dietary, accessibility, and service notes (approved scope).

---

## 1. Surfaces and Dials

| Surface | Route | Skill scope | VARIANCE | MOTION | DENSITY |
|---|---|---|---|---|---|
| Landing | `/` | taste-skill full | 7 | 5 | 3 |
| Booking flow | `/book` | taste-skill form rules only (4.5, 4.6) | 4 | 3 | 4 |
| Confirmation | `/confirmation/:code` | taste-skill | 5 | 4 | 3 |
| Login | `/login` | operational | 2 | 2 | 4 |
| Host (tablet) | `/host`, `/guests/:id` | operational | 2 | 2 | 7 |
| Admin | `/admin/*` | operational | 2 | 2 | 6 |

Rationale:
- Premium-consumer preset (7/6/3), motion dropped to 5: restaurant guests are on mobile data at the beach; motion must stay cheap.
- Booking flow is a form, not a marketing page. Predictability beats variance.
- Host is a front-of-house tablet tool used mid-service. Speed and legibility beat brand.

---

## 2. Audit of Current Prototype

| Area | Current | Verdict |
|---|---|---|
| Stack | Vue 3.5, Pinia, Vue Router, Tailwind 3.4, Vite 6 | **Keep** |
| Palette | `gioi.cream #f7f2ea`, `sand #e9dcc4`, `olive`, `moss`, `clay #b7612f`, `ink #2a2620` | **Retire.** Exactly the banned warm-cream + clay + espresso default; nothing to do with "Ocean" |
| Display font | `ui-serif, Georgia` | **Retire as UI font.** The serif belongs to the logo only; do not imitate it in headlines |
| Status badges | violet / sky / indigo / emerald / amber / red `-100` | **Rework.** 6 unrelated hues; replace with one semantic scale (Section 7) |
| Radius | mix of `rounded-md`, `rounded-lg`, `rounded-full` | **Lock** to one documented rule (Section 3.4) |
| Views | `src/router.ts` lazy-loads `src/views/*.vue`, but `src/views/` and `src/components/` are **empty** in the working tree | **Blocker:** routes will fail to load; restore views before redesign work |
| Dark mode | none | Add token-based dark mode for guest surfaces |
| Icons | none detected | Adopt `@phosphor-icons/vue` |

IA to preserve (Section 11.F): all route slugs above, booking form field names and order, status names (`Pending`, `Confirmed`, `Arrived`, `Seated`, `Completed`, `Cancelled`, `No-show`).

---

## 3. Design Tokens

### 3.1 Palette: "GIOI Navy + Sand" (brand-derived, from Instagram logo)
Palette family: brand navy on a cool off-white, sand reserved for the logo and one brand moment. taste-skill's beige ban is overridden here **only for sand**, because the brand literally uses it in its logo; it is never a page background. Hex values below are sampled from Instagram and must be replaced with the client's official values.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--surface` | `#F3F5F4` (sea-salt off-white, cool) | `#0B1A1F` | Page background |
| `--surface-raised` | `#FFFFFF` at 92% over surface (`#FBFCFC`) | `#12252B` | Sheets, drawers, form panels |
| `--ink` | `#132F45` (navy-black) | `#E6EEF2` | Headlines, body |
| `--ink-muted` | `#4A626A` | `#9DB3B9` | Secondary text (AA on surface both modes) |
| `--line` | `#D5DEDF` | `#23393F` | Hairlines, input borders |
| `--accent` | `#1F4A6B` (GIOI navy, logo) | `#7FA8C9` | Primary CTA, focus ring, selected slot |
| `--accent-ink` | `#F4EFE6` | `#0B1A26` | Text on accent (contrast ≥ 4.5:1 both modes) |
| `--brand-sand` | `#D6C4A3` | `#D6C4A3` | Logo, logo lockups, footer brand block only. Never text on light, never a background |
| `--ikat` | pattern asset (blue/white ikat, from venue textiles) | same, 40% opacity | One decorative band max per page (e.g. footer top edge). Real scanned pattern from client, not hand-drawn SVG |
| `--danger` | `#B3261E` | `#F2B8B5` | Errors, cancel, no-show only |

Rules:
- **One accent.** GIOI navy is the only UI accent. Sand and sunset orange never appear on buttons or status. It is used for CTA, focus, selection. No second accent anywhere, including status badges.
- No pure `#000` / `#FFF` as page backgrounds.
- Shadows tinted to `--ink` (`rgb(14 42 51 / 0.08)`), never black.
- **Sunset orange** lives in photography only. It is not a token.
- **Brand override:** official hex values from the client replace the sampled ones; the structure stays.

### 3.2 Typography
| Role | Font | Spec |
|---|---|---|
| Display | **Cabinet Grotesk** (self-hosted, `font-display: swap`) | 600-800, `tracking-tight`, `leading-[1.05]` |
| Body / UI | **Satoshi** | 400/500, `text-base leading-relaxed max-w-[65ch]` |
| Numbers (times, covers, codes) | Satoshi with `font-variant-numeric: tabular-nums` | Booking codes, slot times, counts |

- No serif. No Inter. Emphasis in headlines uses **bold/italic of Cabinet Grotesk**, never a second family.
- Scale: hero `text-4xl md:text-5xl lg:text-6xl`; section `text-3xl md:text-4xl`; host UI base `text-[17px]` (tablet at arm's length).

### 3.3 Spacing
- Guest: sections `py-20 md:py-28`, container `max-w-7xl mx-auto px-4 md:px-8`.
- Host: 8px grid, rows min 56px tall (touch target), gutters 16px.

### 3.4 Shape rule (single, documented)
- Interactive (buttons, slot chips, status pills): **full pill**.
- Surfaces (images, sheets, panels): **16px**.
- Inputs: **12px**.
Applied everywhere, no exceptions.

### 3.5 Icons
`@phosphor-icons/vue`, weight `regular`, 20px UI / 24px host. No emoji, no hand-drawn SVG.

---

## 4. Landing Page `/`

Job: make someone who found GIOI on Google Maps or Instagram book a table within 30 seconds.

Section plan (6 sections, 5 layout families, 2 eyebrows max):

### 4.1 Nav (64px, single line)
`[GIOI logo]  Menu  Visit  ·  [Book a table]`
- Mobile: logo + "Book a table" pill only; menu links move to a sheet.
- Sticky, `--surface` with 90% opacity + `backdrop-blur-md`, solid fallback under `prefers-reduced-transparency`.

### 4.2 Hero: Asymmetric Split
```
┌───────────────────────────────┬────────────────────────────┐
│ Sunset dining on Kuta beach.  │                            │
│ (≤ 2 lines)                   │   [Photo: Signature Crispy │
│                               │    Duck, or dining room at │
│ Asian fusion, cold coconuts,  │    sunset, 4:5]            │
│ 10am to 11pm, steps from the  │                            │
│ sand. (≤ 20 words)            │                            │
│                               │                            │
│ [Book a table]  [View menu]   │                            │
└───────────────────────────────┴────────────────────────────┘
```
- Photo priority: **beachfront at golden hour** (the brand's own promise: "The Most Beautiful Sunsets Dining in Kuta"), not a dish close-up.
- Hero copy lines 2-3 are placeholders; tone must match the Instagram voice: casual, warm, direct.
- `min-h-[100dvh]` capped, `pt-24` max. 4 text elements max, no eyebrow.
- **Inline quick-book strip** directly under the CTAs on desktop: `Date · Guests · Time → Continue`, prefilling `/book`. On mobile this replaces the secondary CTA. This is the biggest improvement over Chope.
- Mobile: image first (16:10, cropped), text below, single column.

### 4.3 Signatures: Bento (3 cells, exact)
- Large cell: Crispy Duck photo + name + one-line description from the menu.
- Two stacked cells: Crying Tiger, Grilled Giant River Prawn.
- Real photography only. Name and description sit **below** each image, never overlaid.
- Mobile: horizontal scroll-snap, 85% card width.

### 4.4 The place: Full-bleed image + short copy
- Two moods from Instagram: **day** (blue bean bags on sand, ikat cushions) and **night** (fairy lights, lounge). Use a day/night image pair, or one sunset shot.
- Mention family-friendly (kids play area appears in feed) as one line, if client confirms.
- Wide beachfront / dining-room photograph, one headline ("On the beach at Discovery Mall"), one 25-word paragraph.
- Hours and address go here as real venue info (allowed: it is a physical place).

### 4.5 Story: Vertical text stack
- One short paragraph: opened 2016 by the Sadeli brothers, Asian fusion, farm-to-table sourcing. Written as plain fact. **Client must approve the copy.**
- Optional single eyebrow here ("Our story").

### 4.6 Reviews: 3 quotes, marquee not used
- Only real, approved reviews (Google / Chope with permission). ≤ 3 lines each, attribution = first name + country + visit month.
- Show the real aggregate "4.2 on Chope" only if the client is happy to reference Chope; otherwise use the Google rating.

### 4.7 Visit / Footer: 2-column grid
- Left: map embed (static image link to Google Maps for LCP), address, hours, phone / WhatsApp.
- Right: one closing CTA using **the same label**, "Book a table" (no-duplicate-intent rule: the only booking label on the page).
- Small links: Privacy, Terms, Staff login (`/login`, low-emphasis).

### Motion (MOTION 5, all motivated)
| Element | Motion | Reason |
|---|---|---|
| Hero image | fade + 12px rise on load, 600ms `cubic-bezier(0.16,1,0.3,1)` | Hierarchy: lands the first impression |
| Section reveals | CSS `animation-timeline: view()` with IntersectionObserver fallback, stagger 60ms | Storytelling order |
| CTA | `:active scale-[0.98]` | Feedback |
| Everything | Disabled under `prefers-reduced-motion: reduce` | A11y |
No `window` scroll listeners, no marquee, no parallax (mobile battery).

---

## 5. Booking Flow `/book`

Not a wizard across pages. **One page, three grouped steps, progressive disclosure**, sticky summary.

```
Mobile                                   Desktop (lg)
┌──────────────────────┐   ┌─────────────────────────────┬──────────────┐
│ 1 When               │   │ 1 When  (date, party, slot) │ Your booking │
│   Date  [chips 14d]  │   │ 2 Who   (name, phone, email)│ Sat 12 Oct   │
│   Guests [- 2 +]     │   │ 3 Details (occasion, diet,  │ 4 guests     │
│   Time  [slot grid]  │   │   accessibility, notes)     │ 19:30 Deck   │
│ 2 Who ...            │   │                             │ [Confirm]    │
│ 3 Details ...        │   └─────────────────────────────┴──────────────┘
│ [Confirm booking]    │  ← sticky bottom bar on mobile
└──────────────────────┘
```

### 5.1 When
- **Date:** horizontal scroll of the next 14 days as pill chips (day name + date); "More dates" opens native `<input type="date">`. Respect lead-time / cutoff rules.
- **Guests:** stepper, 1 to max party size; above max shows inline "For groups over N, message us on WhatsApp" link.
- **Time:** slots grouped **Lunch / Afternoon / Sunset / Dinner (to last seating)**. Sunset group is visually first-class (label shows today's sunset time, approx. 18:10-18:30 in Kuta) because it is the brand promise and the likely peak-demand window.
- **Seating area** as a segmented control above slots. Likely areas from Instagram: beachfront lounge (bean bags), terrace/deck, indoor. Confirm with client.
- **Events** (sunset yoga, NYE) are not tables. Out of scope for v1; show a link to the Linktree/Instagram event post instead of building ticketing.
- Slot states: available (outline), selected (accent fill), limited (shows "2 left" only if real capacity data), unavailable (disabled, 40% ink, strikethrough not used, `aria-disabled`).
- Availability loads with **skeleton chips** matching slot shape, not a spinner.

### 5.2 Who
- Name, mobile (country code select, default +62, tourists common: +61, +65, +86, +44), email (optional unless config requires).
- Labels above inputs, helper text below, error text below in `--danger`. No placeholder-as-label.
- `autocomplete` attributes: `name`, `tel`, `email`.

### 5.3 Details (collapsed by default, "Add details" disclosure)
- Occasion: pill group (Birthday, Anniversary, Business, Date night, Other).
- Dietary: multi-select pills (Vegetarian, Vegan, Halal, Gluten-free, Nut allergy, Shellfish allergy, Other + text).
- Accessibility: checkbox + text.
- Notes: textarea, 300 chars, counter.
- **Shellfish allergy** gets explicit prominence: this is an ocean/seafood restaurant.

### 5.4 Confirm
- Single primary button "Confirm booking" (full width on mobile, fixed bottom bar with summary line `Sat 12 Oct · 19:30 · 4 guests`).
- Deposit path (if enabled): button becomes "Continue to deposit", booking shown as `Pending` with explicit explanation.
- Errors: conflict at submit ("That time just filled up") → keep form data, scroll to slots, highlight nearest 3 alternatives.
- Policy text (cancellation, late arrival, deposit) inline above button, `--ink-muted`, never hidden in a modal.

---

## 6. Confirmation `/confirmation/:code`
- Large booking code in tabular numerals, copy button.
- Summary block: date, time, guests, area, notes.
- Actions: **Add to calendar** (.ics), **Get directions** (Google Maps link), **Manage booking** (change/cancel if scope allows), **Message us** (WhatsApp deep link).
- Status shown in words ("Confirmed", "Pending deposit"), not only color.
- One supporting image (dining room), small.

---

## 7. Host (tablet) `/host`, `/guests/:id`

taste-skill does not apply. Rules below follow the design doc's Host requirement: today first, fast search, minimal taps.

### 7.1 Layout (landscape tablet, 1024-1366px)
```
┌─────────────────────────────────────────────────────────────────┐
│ GIOI Host   [Search name / phone / code / time ⌘K]  Today ▾  [+]│
├───────────────┬─────────────────────────────────────────────────┤
│ Service       │ 19:00  Wayan S. (4)  Deck  Birthday  [Arrived]  │
│ Lunch  12/40  │ 19:15  Chen L. (2)   Hall  Shellfish ⚠ [Arrived]│
│ Dinner 58/90  │ 19:30  ...                                      │
│               │                                                 │
│ Filters       │ ── Arrived (6) ──                               │
│ ○ Upcoming    │ ...                                             │
│ ○ Arrived     │                                                 │
│ ○ Seated      │                                                 │
└───────────────┴─────────────────────────────────────────────────┘
```
- Default view: today, next 2 hours pinned at top, grouped by time.
- Row: time, guest name, party size, area, occasion/diet flags (icons + text), primary next action button.
- **One primary action per row = next valid status transition** (Confirmed → Arrived → Seated → Completed). Other transitions in an overflow menu. Cancel / No-show require confirm sheet (not browser `confirm()`).
- Tap row → right-side drawer with guest history (visit count, last visit, notes, allergies) without leaving the list.
- Walk-in `[+]` always visible.

### 7.2 Status scale (replaces 6-hue badges)
Single-hue ramp on `--accent` plus neutral and danger. Color is never the only signal: every pill has a label and icon.

| Status | Style | Icon |
|---|---|---|
| Pending | outline, `--ink-muted` | `Hourglass` |
| Confirmed | outline, `--accent` | `CheckCircle` |
| Arrived | 20% accent fill | `DoorOpen` |
| Seated | solid accent, `--accent-ink` text | `Armchair` |
| Completed | neutral fill `--line` | `Check` |
| Cancelled | outline `--danger`, strikethrough time | `XCircle` |
| No-show | 15% danger fill | `UserMinus` |

### 7.3 Host a11y / ergonomics
- Touch targets ≥ 48px, primary buttons 56px.
- Dark mode is the **default on the host** (dim dining rooms at night), toggle available.
- Allergy flags (esp. shellfish) use `--danger` text + icon, visible on the row, not only in the drawer.

---

## 8. Admin `/admin/*`
- Same tokens, density 6. Left nav: Dashboard, Settings, Audit.
- Dashboard: 4 stat tiles max (Covers today, Bookings this week, No-show rate, Direct vs Chope share). Use the `dataviz` skill when building charts.
- Settings: grouped forms (Seating areas, Booking windows, Policies, Deposit). Save bar sticky at bottom; unsaved-change guard.
- Audit: filterable table (who, what, when, before/after). Table is the right tool here.

---

## 9. Content and Assets Needed from Client

| Asset | Needed for | Priority |
|---|---|---|
| Logo (SVG, light + dark) and "OG" monogram | Nav, confirmation, favicon (monogram) | Blocker |
| Ikat pattern scan (cushion/shirt textile) | Single decorative band | Low |
| Confirmed opening hours (IG says 10-22, Chope says 10-23) | Slot bounds | Blocker |
| Brand colors / fonts, if any exist | Override Section 3 tokens | High |
| Photography: 3 signature dishes, dining room, beach view at sunset, 1 team/kitchen shot | Hero, bento, place section | Blocker (no stock food) |
| Menu (PDF or item list) | "View menu" | High |
| Approved story copy | Section 4.5 | Medium |
| 3 approved guest reviews | Section 4.6 | Medium |
| Seating areas, max party size, last seating time, deposit rules | Booking flow | Blocker |
| WhatsApp number, phone, Google Maps URL | Footer, confirmation | High |

Until photography arrives, use clearly-labeled placeholder slots (e.g. `hero-crispy-duck 1600x2000`), not stock images of generic food.

---

## 10. Quality Gates (pre-flight, guest surfaces)

- [ ] Zero em-dashes in visible copy (use hyphens, commas, periods).
- [ ] One accent (lagoon teal) across all sections and status UI
- [ ] One radius rule (Section 3.4)
- [ ] One booking CTA label everywhere: **"Book a table"**; form submit: **"Confirm booking"**
- [ ] Hero: ≤ 2-line headline, ≤ 20-word subtext, CTA above fold on 375×667
- [ ] ≤ 2 eyebrows on the landing page
- [ ] All CTAs and inputs pass WCAG AA in light and dark
- [ ] Reduced-motion honored; no scroll listeners
- [ ] LCP < 2.5s on 4G (hero image preloaded, AVIF/WebP, `width`/`height` set)
- [ ] Skeleton / empty / error states for slots, submit conflict, and host list
- [ ] Only real numbers on the page (rating, hours); no invented stats
- [ ] Localised names in mocks (e.g. Wayan, Kadek, Chen, Olivia from Perth), not "John Doe"
- [ ] Indonesian (`id`) copy variant planned for guest pages (tourist + local audience)

---

## 11. Implementation Notes (for later, not executed)

- Replace `tailwind.config.js` `gioi.*` colors with CSS-variable tokens; enable `darkMode: 'class'` + `prefers-color-scheme` default.
- Add deps: `@phosphor-icons/vue`; self-host Cabinet Grotesk + Satoshi (Fontshare license, free commercial).
- No animation library needed: CSS transitions + `animation-timeline: view()` cover MOTION 5.
- Restore `src/views/*.vue` first; router currently points to missing files.

## Sources
- Instagram @gioioceangourmet (viewed 2026-09-30): https://www.instagram.com/gioioceangourmet/
- Chope listing: https://www.chope.co/bali-restaurants/restaurant/gioi-ocean-gourmet-kuta?lang=en_US
- Glints, GIOI Group: https://glints.com/id/companies/gioi-group/c3e15847-3e33-438c-a435-d61de1ebe571
