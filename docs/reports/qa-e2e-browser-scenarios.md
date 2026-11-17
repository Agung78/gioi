# GIOI — QA E2E Browser Scenarios

Manual (or Playwright-ready) browser scenarios for `apps/web` + `apps/api`.
Derived from the journey diagrams in [`docs/design/diagrams/`](../design/diagrams) (`customer-journey`, `host-journey`, `admin-journey`) and the code as of **2026-11-17 (`0c228bf` plus the uncommitted working-tree refactor: JSON exports, nested public venue payload, shared area picker)**; audited statically against `apps/` on that date (not re-run in a browser). Floor plan behaviour is specified in [`floor_plan_seating.md`](../design/floor_plan_seating.md). Run on a clean seeded database.

**Priority:** P0 = release blocker, P1 = must pass before launch, P2 = polish.
**Status:** `☐` not run, `✔` pass, `✘` fail (link the bug). Marks include the 2026-11-12 parallel run. Rows whose behaviour changed after their last run were reset to `☐` and carry **(changed)**; rows added on 2026-11-17 carry **(new)**.

## What changed since the 2026-11-12 run

| Area | Change | Scenarios |
|---|---|---|
| Group landing | `/` is a "Coming soon" announcement page (logo, one "Visit <venue>" pill per `VENUE_SEO` entry, Privacy) instead of the venue card grid | P-01 |
| Venue page | Header nav Menu / Experience / Visit + Reserve; About; Signature dishes with zoom dialog (menu PDFs moved there); Menu highlights removed; Google Maps / Tripadvisor buttons with ratings; 8 animated FAQs; NYE 2027 banner + popup (Bali, until 2027-01-01 WITA); hours weekday mapping fixed (rows were shifted one day) | P-02, P-03, P-15…P-18, G-01, G-02 |
| SEO / hosting | geo meta, `rel=llms`, logo + hero preloads with srcset, BreadcrumbList, `openingHours` strings, `sameAs`, `containedInPlace`; sitemap drops `/privacy` and adds `lastmod`; `/index.html` and `/brands/gioi-ocean-gourmet` (+ typo) 301; HSTS `preload`; unknown slugs 404 before any API call; pinia 3 | P-04, P-05, P-08, P-13, P-14, X-11 |
| Booking | Country required (combobox offers "Unknown / prefer not to say"); "today" and the date strip use the venue zone, plus a time-zone note; past / lead-time / cut-off slots hidden; event slot on the notice date; notice popup opens on load while a notice is upcoming, has a headline and a WhatsApp link; bigger table tap targets | G-04, G-06, G-11, G-12, G-52, G-55, G-59…G-63 |
| Feedback | Thank-you page offers "Share your visit on Google" | G-23 |
| Public theme | Every public page follows the OS when unset; no app header on public pages; floating theme button sits above the booking bar | G-28, G-29, U-01 |
| Host | Polls every 15 s and only while the tab is visible; Status + Source filters in the tab bar; action-verb status buttons; Today disabled on today; nationality required for walk-ins; floor plan loaded once per venue on `/host` and shared by the modals | H-02, H-03, H-05, H-16, W-01, W-03, W-14, W-15 |
| Exports | All three exports (Settings, Dashboard, Host day) open an **Export viewer** (column toggles, preview, Download); the API returns JSON (`/admin/venues/:id/export`, `/staff/venues/:id/export`), CSV and escaping happen in the browser; `nationality` column added; the `.csv` routes are gone | T-08, D-11, H-17, R-07, R-10, X-09, X-13, U-09 |
| Dashboard | Reservations table filtered, searched and paged in the DB (`/admin/reservations`); feedback summary over the whole range + Load more (`/admin/feedback`, keyset cursor); previous-period deltas; filters in the URL; Reset filters; status change reloads only the table; period panels computed in SQL; new date-range messages | D-02, D-03, D-07…D-11, D-17…D-22 |
| Settings | Special notice gains Event time, Event name, Popup headline and a multi-line message (migrations `0009`, `0010`); Accounts Remove button is red; DatePicker panel is full width on phones | T-31, T-32, T-33, U-10 |
| API / infra | `/health` no longer queries the DB; `PATCH /staff/reservations/:id` validates `partySize` 1–100; walk-ins without an area use the public smallest-fit area picker (honours area party limits); `next-statuses` route removed | B-08, C-08, W-04, X-13 |
| Floor plan editor | Phones (< 768 px) show a "works best on a larger screen" note | F-25 |

<details><summary>What changed between the 2026-11-09 and 2026-11-12 runs</summary>

| Area | Change | Scenarios |
|---|---|---|
| Public site | `/` is now a group landing page (no redirect to `/bali`); venue page has SEO meta, JSON-LD, FAQ, menus PDFs, Privacy link; `/privacy`, `/sitemap.xml`, `/llms.txt`; custom error page | P-01…P-12, G-01, G-30 |
| Hosts | `book.*` serves only the booking flow; the site host 301s booking routes to `book.*`; the old `admin.*` rule is gone | U-07, P-09, P-10 |
| Booking form | Email is required; country combobox; phone input with country code; inline name/phone errors; Turnstile replaced by a honeypot; `?src=` booking source; special notice gate | G-04, G-12, G-15b, G-50…G-58 |
| Tables | Bookings now hold real tables (`reservation_tables`). The guest can choose one table; the server auto-assigns the smallest free table that fits; staff can join several tables | G-33, G-44…G-49, W-07…W-13, C-01…C-08 |
| Grace / takeover | Venue `graceMinutes` (default 15). A walk-in may take a table from a `pending`/`confirmed` holder who is past start + grace; that holder becomes `no_show` | W-10, W-11, T-29 |
| Host | Walk-in uses the selected day (not always today), optional phone, 12-hour time picker, table picking; Change table modal; WhatsApp reminder; status filter; day CSV export; table label and Repeat chip on cards | H-04, H-11, H-14…H-18, W-01…W-13, C-* |
| Super admin | Header venue selector (persists in `localStorage` `gioi.venueId`) drives Host, Dashboard and Settings | V-01…V-08, T-01, T-13, T-15, T-24 |
| Dashboard | Export CSV now works; area filter removed (Range, Status, Source, Occasion); shared pagination component | D-03, D-11 |
| Security | CSV formula-injection escaping; `mapsUrl` must be http(s); JSON-LD `<` escaped; prod security headers + CSP (vercel.json) | X-09…X-12, T-30 |

</details>

## 0. Setup

| Item | Value |
|---|---|
| Web | `http://localhost:3000` (Nuxt dev; `/api/**` proxies to `127.0.0.1:3001`; `bookUrl` is empty in dev so booking links stay on localhost). Set `NUXT_PUBLIC_API_BASE=http://127.0.0.1:3001` in `apps/web/.env`, else SSR of `/bali` reads production data |
| API | `http://127.0.0.1:3001` (`pnpm --filter api dev`, node@22) |
| DB | Migrations `0001`…`0010` applied (there is no `0006`), then seeded (`pnpm --filter api prisma:seed`) |
| Super admin | `admin` / `password` (isSuperAdmin; seed also links it to Bali as venue `admin`). Picks the working venue in the header select |
| Host | `host` / `password` (venue role **`host`**; confirm in Settings → Accounts before testing) |
| Venue admin | `venueadmin` / `password` (seeded; not super admin, venue role `admin`) |
| Tables | **The seed creates no tables.** As `venueadmin`, open Floor plan and add tables in at least 3 areas (mix of 2-, 4- and 6-seat), Save layout. Needed by G-31…G-49, G-63, W-07…W-15, C-* |
| Browsers | Desktop Chrome at 100%, plus mobile 390×844. Run the public booking flow (G-*) in both |
| Two-device tests | Two separate browser profiles (or normal + incognito); managed Chromium shares one cookie jar per host, so use `localhost` vs `127.0.0.1` per profile |
| Time-zone tests | G-61 needs the OS (or DevTools → Sensors → time zone override) set to a zone other than `Asia/Makassar` |

Reset between runs: re-seed, or `TRUNCATE venues, users CASCADE` on the **test** DB only.

> The DB integration tests must run against `gioi_test`. If `TEST_DATABASE_URL` is exported pointing at the dev DB they fail.

## Diagram coverage map

| Diagram stage | Scenarios |
|---|---|
| Public site, SEO, hosts | P-01…P-18 |
| Customer 1 Discover `/bali` | G-01…G-03 |
| Customer 2 Book `/bali/book` | G-04…G-15b, G-50…G-62 |
| Customer 2a Seating map + table choice | G-31…G-49, G-63 |
| Customer 3 Confirmation | G-16…G-21 |
| Customer 4 Feedback | G-22…G-27 |
| Host 1 Sign in | A-01…A-15 |
| Host 2 Today's service + status machine | H-01…H-18 |
| Host 3 Walk-in (+ tables, takeover) | W-01…W-15 |
| Host 3a Change table | C-01…C-08 |
| Host 4 Guests | S-01…S-14 |
| Admin 1 Sign in / role gate | A-02, A-03, R-* |
| Admin 2 Dashboard | D-01…D-22 |
| Admin 3 Settings (+ every save audited) | T-01…T-12, T-29…T-33 |
| Audit log | L-01…L-06 |
| Super admin venues, accounts, venue selector | T-13…T-28, R-14, V-01…V-08 |
| Exports (Settings, Dashboard, Host) | T-08, D-11, H-17, U-09, X-09, X-13 |
| Bootstrap, prod, CI | B-01…B-08, D-13 |
| Floor plan & seating (admin) | F-01…F-25, T-06 |

---

## 1. Customer journey (public, no login)

### 1.0 Public site, SEO and hosts

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| P-01 | P0 | Group landing **(changed)** | Open `/` | Centered announcement page: GIOI Group logo, "Announcement", "GIOI Group", "Our new website is under development. Coming soon.", one pill per `VENUE_SEO` venue ("Visit GIOI Ocean Gourmet Bali" → `/bali`), Privacy in the footer; follows the OS theme; prerendered; no redirect | ☐ |
| P-02 | P1 | Venue page sections **(changed)** | Open `/bali`, scroll | NYE banner (P-15) → hero (badge, headline, quick-book) → About → Signature dishes (P-16) → Experience scenes → Visit (address, Get directions, Google Maps + Tripadvisor buttons, WhatsApp, phone, Instagram, hours with live WITA clock) → FAQ (8 questions, `+` rotates on open, animated in Chromium 131+) → CTA → footer. No "Menu highlights" section | ☐ |
| P-03 | P1 | Menu PDFs **(changed)** | Under Signature dishes, click "Food and Beverage Menu (PDF)" and "Alcohol Menu (PDF)" | `/menus/bali-menu.pdf` and `/menus/bali-alcohol-menu.pdf` open | ☐ |
| P-04 | P1 | SEO meta **(changed)** | View source of `/bali` | `<title>`, new description, canonical `https://gioigroup.com/bali`, og:image, twitter card; `geo.region` `ID-BA`, `geo.placename`, `geo.position`, `ICBM`; `<link rel="llms" href="/llms.txt">`; preloads for `/logo-96.webp` and the hero with `imagesrcset` (800/1200/1600). JSON-LD `Restaurant` with description, `sameAs` (Instagram, Google Maps, Tripadvisor), `containedInPlace` Discovery Mall Bali, address, geo, `openingHoursSpecification` on the **right weekdays** (Monday = Settings Monday) plus `openingHours` strings (`Mo 10:00-22:00`…), `acceptsReservations`, `ReserveAction`, **no** `aggregateRating`; `BreadcrumbList` (Home → venue); `FAQPage` with the 8 FAQs; `<` escaped | ☐ |
| P-05 | P1 | Unknown venue **(changed, was ✘)** | Open `/nope`, `/dashboard`, `/settings` | HTTP 404 custom error page ("404 · This page does not exist."; button back to `/bali`; `noindex`), not 500 `obj.hasOwnProperty`. Re-run after the pinia 3 / `@pinia/nuxt` 0.11 upgrade and the slug allow-list (P-14) | ☐ |
| P-06 | P2 | API down on venue page | Stop the API, open `/bali` (SSR) | 503 error page ("Something went wrong"), not a soft 404 | ☐ |
| P-07 | P1 | Privacy page | Open `/privacy` from the footer | Renders; prerendered | ✔ |
| P-08 | P2 | Crawl files **(changed)** | `GET /robots.txt`, `/sitemap.xml`, `/llms.txt` | robots disallows `/login /host /admin /guests /ingest`; sitemap lists `/` and each venue with `<lastmod>` = today, **not** `/privacy`; llms.txt lists venues, menus, booking links (markdown) | ☐ |
| P-09 | P1 | Booking pages are noindex | Response headers of `/bali/book`, `/bali/confirmation/<code>`, `/bali/feedback/<code>` | `X-Robots-Tag: noindex` | ✔ |
| P-10 | P1 | Host redirects (prod/preview with real hosts) | `book.gioigroup.com/` · `book.gioigroup.com/bali` · `gioigroup.com/bali/book` · `book.gioigroup.com/admin` | → `gioigroup.com/` (302) · → `gioigroup.com/bali` (301) · → `book.gioigroup.com/bali/book` (301) · 404 | ☐ |
| P-11 | P2 | Trailing slash (prod only) | `/bali/` | 301 → `/bali` (the dev server does not do this) | ☐ |
| P-12 | P2 | Theme script | Set dark, reload `/bali` | No light flash before hydration (head script reads `gioi-theme`) | ✔ |
| P-13 | P2 | Legacy URLs **(new, prod only)** | `/index.html`; `/brands/gioi-ocean-gourmet`, `/brands/gioi-ocean-gourmet/`, `/brands/gioi-ocean-gourment` | 301 → `/`; 301 → `/bali` for all three | ☐ |
| P-14 | P1 | Bot paths never reach the API **(new)** | Watch the API log; open `/wp-login.php`, `/.env`, `/nope/book` | First two: 404 page and **no** `/public/venues/...` request (`useVenue` checks `VENUE_SEO` first). `/nope/book` (booking page, own fetch): "Venue not found." | ☐ |
| P-15 | P1 | NYE promo (Bali) **(new)** | Open `/bali` in a fresh tab; wait ~1.2 s; close; reload; open a new tab; block storage and reload | Yellow banner "The Final Splash NYE 2027 · Early Bird from IDR 450,000++" with "Book your table". Popup (poster image + "Book your table") opens once per tab session (`sessionStorage` `promo-seen:nye-2027`); ×, Esc and backdrop close it; a new tab shows it again; with storage blocked it shows on every load. Both CTAs go to `https://book.gioigroup.com/bali/book?date=2026-12-31&party=2` (also in dev). PostHog `promo_banner_clicked`, `promo_popup_shown`, `promo_popup_dismissed`, `promo_popup_cta_clicked` (prod key only). From 2027-01-01 00:00 WITA neither shows; other venues never show it | ☐ |
| P-16 | P2 | Signature dishes **(new)** | Scroll to Signature dishes; click each image; Esc; click the zoomed image | 4 cards (OG Seafood Platter, Salmon Lodeh, Jimbaran King Prawn, Crispy Duck with two price lines); click opens a full-size dialog; Esc or click closes; images use 640w/1024w srcset; price note under the grid | ☐ |
| P-17 | P1 | Header nav + Reserve **(new)** | 390 px and desktop: click Menu, Experience, Visit, Reserve; repeat on `/bali?src=instagram` | Anchors scroll to `#signatures`, `#experience`, `#visit`; Reserve reads "Reserve" on phones and "Reserve a table" from `sm`; it carries `?src=instagram` when present; no horizontal overflow at 390 px | ☐ |
| P-18 | P2 | About + review links **(new)** | Read About; click Google Maps and Tripadvisor in Visit | About heading "About GIOI Ocean Gourmet Bali" with 2 paragraphs and logo; buttons show "4.9 · 3,000+ reviews" / "4.9 · 750+ reviews" (hard-coded) and open the Google Maps place and the Tripadvisor page in a new tab | ☐ |

### 1.1 Discover — `/bali`

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| G-01 | P0 | Landing loads **(changed)** | Open `/bali` | Sections of P-02 render; no console errors besides U-05 | ☐ |
| G-02 | P1 | Visit & hours **(changed, was ✔)** | Check address, Get directions, WhatsApp, call links, live WITA clock, 7-day opening hours; set a distinct time on one weekday in Settings | Values match venue settings; links valid; clock is Asia/Makassar; the Mon…Sun rows show **that weekday's** hours (before `1c957e5` every row was shifted one day, so the earlier ✔ was wrong) | ☐ |
| G-03 | P1 | Quick-book → booking | Choose date (today … +90 days, closed dates disabled) and Guests (select of party min…max), Find a table; repeat with `/bali?src=instagram` | Lands on `/bali/book?date=…&party=…` pre-filled; with `src` the query also carries `src=instagram`. Note: the quick-book "today" is the browser date, the booking page uses the venue date (G-61) | ☐ |

### 1.2 Book — `/bali/book`

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| G-04 | P0 | Happy path **(changed)** | **1 When** (14-day strip, party stepper, optional table on the map, see 1.2a) → time grid → **2 Who** (name, phone with country code, email, **country (required)**) → **3 Details** → accept cancellation policy → Confirm booking | Redirect to `/bali/confirmation/<code>`; booking is `pending`; shows on `/host` with a table label (auto-assigned or chosen) | ☐ |
| G-05 | P1 | Date strip on mobile | 390px viewport | First pill has a left gutter (not flush to the edge); strip scrolls and snaps; "More dates" picker works | ✔ |
| G-06 | P1 | Time grid states **(changed)** | Look at Lunch / Afternoon / Sunset / Dinner groups across days, incl. today | Past, lead-time and cut-off slots are **hidden** (no more `Too soon` pills); a group with nothing left disappears; remaining slots show `N left` only when 2 or fewer remain, `Full`, or `Closed`; unavailable ones not selectable | ☐ |
| G-07 | P1 | Closed day / closed date | Pick a closed weekday or a date in Settings → Closed dates | Pill disabled or all slots `Closed` | ✔ |
| G-08 | P0 | Capacity (no overbooking) | Fill a slot to capacity from two tabs | Last slot becomes `Full`; API never exceeds capacity | ✔ |
| G-09 | P0 | **Slot race** | Tab A and B select the same last slot; B confirms first, then A confirms | A sees "That time just filled up. Pick another slot above."; selected time is cleared; grid refreshes; no booking created for A | ✔ |
| G-10 | P1 | Party-size bounds | Stepper at `partyMin`/`partyMax`; tamper via API | UI blocks; at max a "Groups over N? Message us on WhatsApp" link shows; API 422 | ✔ |
| G-11 | P1 | Lead time and cutoff **(changed)** | Today's slots inside `leadTimeMinutes` / after `cutoffMinutes`; `POST` such a time | Not shown in the grid (were `Too soon`); API 422 "too soon to book" | ☐ |
| G-12 | P1 | Required fields **(changed)** | Blur empty name and phone; leave email and country empty; type an invalid email | "Enter your full name." / "Enter a WhatsApp / phone number…" under the fields; summary prompt "Enter full name, phone, email & country"; Confirm disabled until country is set; browser blocks submit on empty/invalid email; API without `email` → 400; API without `country`, or `"country":"  "` → 400 ("country is required" / schema); nothing created | ☐ |
| G-13 | P1 | Details (optional) | Occasion, dietary pills + free text, accessibility, special requests (300-char counter) | Stored; allergies merged into the guest's list; visible on host card and guest profile | ✔ |
| G-14 | P1 | Policy gate | Try to confirm without accepting the cancellation policy | Blocked | ✔ |
| G-15 | P1 | Idempotency | Double-click Confirm | Exactly one reservation (the button is disabled while submitting). **A reload and resubmit creates a second booking**: the idempotency key is generated per click, so the server key replay only protects an identical retry | ✔ |
| G-15b | P1 | Honeypot (replaces Turnstile) | Fill the hidden `website` input via DevTools, submit; or `POST` with `"website":"x"` (and a `country`) | 200 with a random code; **no** reservation, guest or audit row created; opening that code's confirmation shows "We couldn't find that booking code." | ✔ |

### 1.2a Seating map and table choice on the booking page

Guests pick a **table** on the venue map. Choosing it sets the seating area **and** sends that `tableId`; the server checks the table is free and seats the party. Without a choice the server picks an area, then the smallest free table in it that seats the whole party (or no table when none fits). After a time is picked, `GET /api/public/venues/<slug>/table-availability` greys out tables that are held in that window or are smaller than the party. **Party limits are not editable in the floor plan editor and are cleared by the first layout save**; set them by SQL/API before running G-35 and G-40.

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| G-31 | P1 | Map visibility | Open `/bali/book`, then a venue whose plan has no tables | Map ("Pick a table area") sits between Guests and Time; no Seating pills; with no tables there is no map and the booking still works | ☐ (shown ✔; empty-plan case not run) |
| G-32 | P0 | Tap a table | Click any table | Dialog opens with the area name, "Table for N" and a fit message; table gets a ring | ✔ |
| G-33 | P0 | Choose a table | Choose a 4-seat Sunset Terrace table (party 2) | Dialog closes; table fills orange with a check badge; "Selected: Sunset Terrace" under the map; other areas fade; slots refetch with `area=<id>`; summary Seating shows the area | ✔ |
| G-34 | P1 | Clear | Open the chosen table | Buttons are Close and Clear; Clear → no table, no area, summary "Any available table" | ✔ |
| G-35 | P1 | Fit rules | Before picking a time: party 6, open a Chef's Counter table (max 4); open a 2-seat Main Hall table | Chef's Counter: "Not available for a party of 6 (up to 4)", Choose disabled. 2-seat: "This table seats 2. Your party of 6 will be seated in Main Hall, and our host will join 3 tables for you, not at this exact table." Choose enabled | ✔ |
| G-36 | P1 | Dismiss | Esc; click the backdrop; Close | Each closes the dialog and keeps the selection unchanged | ✔ |
| G-37 | P1 | Keyboard | Tab to a table, Enter / Space | Dialog opens; Esc closes; focus ring visible; disabled tables are skipped (no tabindex) | ✔ (Enter + Esc; focus ring not eyeballed) |
| G-38 | P0 | Book with a chosen table | Choose a table, pick a time, fill Who, accept policy, Confirm | Confirmation Seating = that area; `/host` card shows "Table N" with the same number as on the map | ✔ |
| G-39 | P1 | Book without choosing | Same, but never open a table | Booking succeeds; server picks an area and the smallest free table that seats the party; host card shows "Table N" (or "No table" if none fits) | ✔ |
| G-40 | P1 | Party change drops a bad area | Choose Chef's Counter, raise party to 6 | Selection cleared automatically ("Selected:" gone) | ✔ |
| G-41 | P1 | Mobile 390×844 | Run G-32/G-33 | No horizontal overflow; map fits; dialog is a bottom sheet with readable buttons | ✔ |
| G-42 | P1 | Theme | Open the dialog in dark and light | Text and buttons readable in both | ✔ |
| G-43 | P2 | Area not open for online booking | Table of an area with `bookable = false`; also `POST` a `tableId` from that area | "This area isn't open for online booking…", Choose disabled; API 409 `no_area` | ☐ (no such area in the seed) |
| G-44 | P0 | Held tables greyed | Book table 3 at 19:00 in tab A; in tab B pick the same date, 19:00, party 2 | Table 3 dimmed (35%), not focusable, not clickable; label says "(unavailable)"; other times within ± dining minutes also dim it | ✔ |
| G-45 | P1 | Small tables greyed | Party 5, pick a time | Every table with fewer than 5 seats is dimmed; if no table seats 5, no table can be chosen and the booking still works by area. (Changing the party clears the time: pick it again) | ✔ |
| G-46 | P1 | Chosen table becomes unavailable | Choose a 2-seat table with no time picked, then raise party to 4 and pick a time | The table choice is dropped (no badge); the area stays selected | ✔ |
| G-47 | P0 | **Table race** | Tabs A and B choose the same table and time; B confirms, then A | A sees "That table was just taken. Pick another table."; choice cleared; map refreshes with that table dimmed; A's time is kept | ✔ |
| G-48 | P1 | Table API validation | `POST` with an unknown `tableId`; a `tableId` + `seatingAreaId` of another area; a table smaller than the party | 422 `unknown table` / `table is not in that seating area` / `tables are too small` | ✔ |
| G-49 | P2 | Tooltip | Hover a table with a mouse | Tooltip "<Area> · seats N · fits N / not for N / not bookable online"; flips below for tables near the top edge | ☐ (flip case not run) |

### 1.2b Booking extras

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| G-50 | P1 | Phone input **(changed)** | Type `0812 345 678` with Indonesia; type `65` in the code box and pick Singapore; type `1242`; arrow keys + Enter in the list | Leading 0 stripped, digits grouped `812-345-678`; stored as `+62 812-345-678` / `+65 …`; the list now holds every ISO region (NANP islands keep their area code, e.g. Bahamas `+1242`, distinct from US/CA `+1`); filters by dial code, name or ISO; Esc closes | ☐ |
| G-51 | P1 | Same guest by phone | Book twice with the same phone (once typed with a leading 0), different name/email | One guest row (dedupe on venue + phone); name/email updated to the latest; allergies merged, not replaced | ✔ |
| G-52 | P1 | Country **(changed)** | Focus the empty Country box; pick "Unknown / prefer not to say"; book; book again picking Australia | First option is always "Unknown / prefer not to say"; required (G-12); stored on the guest (latest booking wins); shown on `/guests/<id>` ("· Australia") and as `nationality` in exports | ☐ |
| G-53 | P1 | Booking source | Book from `/bali/book?src=instagram`, `?src=google`, `?src=whatsapp`, `?src=bogus`, no `src` | Source `instagram` / `google` / `whatsapp` / `website` / `website` on the host card and dashboard channels | ✔ |
| G-54 | P1 | Source cannot claim staff channels | `POST` with `"source":"walk_in"` or `"host"` | 400 (schema enum) | ✔ |
| G-55 | P0 | Special notice gate **(changed)** | Settings: enable notice, date = a future day D, headline, message. Open `/bali/book` on another date, close the popup; pick D; switch away and back | The popup opens **on page load** whenever a notice is enabled with date ≥ today (WITA), whatever date is selected. On D it opens again; the "I have read and agree…" checkbox is disabled until the popup is closed; Confirm disabled until ticked; prompt "Read and accept the special notice"; switching away and back resets the tick and reopens the popup | ☐ |
| G-56 | P1 | Notice API rule | `POST` for the notice date without `noticeAccepted`; for another date without it | 422 "special notice must be acknowledged" / 201 | ✔ |
| G-57 | P1 | Notice expiry | Notice date in the past | Booking page shows no popup and no gate; opening Settings as venue admin turns `noticeEnabled` off and clears the date (audited) | ☐ |
| G-58 | P0 | Marketing consent (privacy) | Tick "Send me occasional news…" and book; book again with the same phone and the box unticked | Guest `marketing_consent = true` with `marketing_consent_at` set; profile shows "yes"; the unticked second booking does not withdraw it | ✔ |
| G-59 | P0 | Event slot on the notice date **(new)** | Settings: notice on date D, Event time 19:30, Event name "NYE Dinner & Party". Open D on `/bali/book`; open D±1; `POST` D at 19:00 and at 19:30; add D to Closed dates | On D the grid shows **one** large slot "NYE Dinner & Party / 19:30" and no Lunch/Dinner groups; it is selectable and shows `N left` / `Full` like a normal slot. Other dates are normal. API: 19:00 → 422 "outside opening hours"; 19:30 → 201 even when 19:30 is outside normal hours (still capacity- and lead-time-checked). D closed → slot disabled. Name or time empty → no event slot (normal day) | ☐ |
| G-60 | P1 | Notice popup content **(new)** | Notice with headline "NYE policy" and a message containing the word "WhatsApp" and line breaks; click the link | Eyebrow "Special notice", headline as `h3`, message keeps line breaks and scrolls when long; every "WhatsApp" word links to `wa.me/<venue whatsapp>` in a new tab (PostHog `whatsapp_clicked` `from: notice`); button "I understand" closes; backdrop and Esc close too | ☐ |
| G-61 | P1 | Venue time zone **(new)** | Set the device zone to `Europe/London` (WITA − 8 h) and open `/bali/book` between 16:00 and 24:00 London time; then set `Asia/Makassar` | The strip's first day is the **WITA** date (tomorrow in London); above the time grid "All times are WITA (venue time), 8h ahead of your local time." (or "… behind …"); no note when the device is in WITA; the note is not in the SSR HTML (no hydration warning) | ☐ |
| G-62 | P1 | No more times today **(new)** | Open today after the last bookable slot (or set cut-off high) | "No more times available today. Try another date."; other dates unaffected | ☐ |
| G-63 | P1 | Table tap targets on phones **(new)** | 390×844: tap each table, incl. small 2-seat tables next to each other | Every table has an invisible ≥ 44 px hit circle (scales with the map width); the tapped table, not its neighbour, opens; resize the window and repeat | ☐ |

### 1.3 Confirmation — `/bali/confirmation/:code`

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| G-16 | P0 | Details + pending state | Land after booking | Shows status `pending`, code, date/time/party/area (times in the venue zone) | ✔ |
| G-17 | P1 | Copy button | Click Copy next to the code | Code in clipboard; button reads "Copied" for ~1.5 s | ✔ |
| G-18 | P1 | Add to calendar **(changed payload)** | Click Add to calendar | `.ics` downloads; SUMMARY = venue name, LOCATION = venue address (read from the nested `restaurant` object now), right time/WITA zone | ☐ |
| G-19 | P1 | Directions / WhatsApp **(changed payload)** | Click each | Correct maps URL and wa.me number (nested `restaurant.mapsUrl` / `restaurant.whatsapp`) | ☐ |
| G-20 | P0 | No PII on lookup | Open the URL in a fresh browser; call `GET /api/public/reservations/<code>` | No phone/email/internal notes/table ids; unknown code → "We couldn't find that booking code." | ✔ |
| G-21 | P1 | Cancel (API only) | **Diagram: no cancel button in the web UI yet.** `POST /api/public/reservations/<code>/cancel` for `pending`/`confirmed`; then for `arrived`/`seated`/`completed` and repeat | First → `{ bookingCode, status: 'cancelled' }` (visible on host view; its table is free again; status event + audit by `guest`); others → 409; a second cancel → 409 | ✔ |

### 1.4 After the visit — `/bali/feedback/:code`

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| G-22 | P1 | Only completed | Open feedback for a non-completed booking, submit | Rejected (409) | ✔ |
| G-23 | P0 | Happy path **(changed)** | Complete a booking as host; open the feedback link; rate (try 1★ and 5★), pick tags, comment, submit | Saved; thank-you state with **"Share your visit on Google"** (opens the Google write-review link in a new tab, shown for every rating) and "Back to GIOI"; appears in Admin → Guest feedback | ☐ |
| G-24 | P1 | Stars required | Submit with no rating | "Please choose a rating." | ✔ |
| G-25 | P1 | Tags offered | Check tag list | Tags come from the venue's `feedbackTags` (seed: 8, e.g. Seafood freshness, Sunset view, Attentive service); falls back to Food, Service, Atmosphere, Value when the list is empty (dev DB). The Settings tags field is read-only | ☐ |
| G-26 | P1 | One feedback per booking | Submit twice | Second rejected | ✔ |
| G-27 | P1 | Unknown code | `/bali/feedback/BADCODE` | "Booking not found", no crash | ✔ |

### 1.5 Public UI

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| G-28 | P2 | Theme toggle **(changed)** | Clear `gioi-theme`; open `/`, `/bali`, `/bali/book`, a confirmation and a feedback page with the OS in light, then dark; click the theme button | Every public page follows the OS when unset (booking pages no longer force dark); no app header on public pages (the booking page has its own Back link); a round theme button floats bottom-right; click cross-fades and persists; reduced motion = instant | ☐ |
| G-29 | P2 | Theme button vs summary bar **(changed)** | Mobile `/bali/book`; then ≥ 1024 px | Below `lg` the button sits above the sticky bar (which now shows one line "summary · missing step" and a 48 px Confirm); from `lg` it drops to the corner | ☐ |
| G-30 | P1 | Footer, no staff-login link | Scroll to the `/bali` footer | Visit → FAQ → CTA → **one** footer: logo, "GIOI Ocean Gourmet · <address>", phone, Instagram handle, Privacy; no "Staff login"; `/login` still opens by URL | ✔ |

---

## 2. Authentication & session

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| A-01 | P0 | Host login | `host` / `password` | → `/host`; **no nav bar** (a single link hides it); chip "Host User · host" | ✔ |
| A-02 | P0 | Super admin login | `admin` | → `/admin`; nav Host, Dashboard, Settings, Audit (no Floor plan); chip reads "Super Admin" (the `· super admin` suffix shows only when the user's name differs from the role); venue select, theme button and Sign out in the header | ✔ |
| A-03 | P0 | Venue admin login | `venueadmin` | → `/admin`; nav Host, Dashboard, Settings, Floor plan (no Audit); no venue select | ✔ |
| A-04 | P0 | Bad credentials | Wrong password / unknown login / inactive user | Same "Invalid login or password." for all; no user enumeration | ✔ |
| A-05 | P1 | Login rate limit | 11 wrong attempts, same login + IP, 15 min | 11th → 429 "Too many attempts. Try again later."; correct password also blocked until the window ends; other logins unaffected | ✔ |
| A-06 | P0 | Auth guard | Logged out, open `/host`, `/admin`, `/guests/<id>` | → `/login` | ✔ |
| A-07 | P0 | **Single device per user** | Profile A logs in as `host`; profile B logs in as `host` | A's next action → 401 → `/login?reason=session` with "You were signed out…" banner; B keeps working | ✔ |
| A-08 | P0 | Different users unaffected | A = `host`, B = `admin` | Both stay logged in | ✔ |
| A-09 | P1 | Logout | Sign out | Cookie cleared → `/login`; Back button shows no data (API 401) | ✔ |
| A-10 | P1 | Expiry / cleared cookie | Delete session row or cookie | Next API call → 401 → `/login?reason=session` | ✔ |
| A-11 | P1 | Cookie flags | DevTools → Cookies | `gioi_session`: HttpOnly, Secure, SameSite=Lax, Path=/ | ✔ |
| A-12 | P1 | Deactivated user | Set `active=false` while logged in | Next request 401 | ✔ |
| A-13 | P1 | CSRF origin check | With `CORS_ORIGIN` set, POST/PATCH staff routes from a foreign `Origin` | 403 "origin not allowed"; same-origin works | ✔ |
| A-14 | P1 | Open redirect | `/login?next=//evil.com` then log in | Stays on this site | ✔ |
| A-15 | P2 | Tab titles | Visit Host, Dashboard, Settings as each role | Title "<Page> · <Role> \| GIOI" (e.g. "Dashboard · Admin \| GIOI"); Host page as host: "Host \| GIOI". The pages no longer show a role eyebrow above the H1 | ☐ (host ✔) |

## 3. Role-based access

Expected is shown as **host / venue admin / super admin**.

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| R-01 | P0 | `/admin` | Type URL | → `/host` / loads / loads | ✔ |
| R-02 | P0 | `/admin/settings` | Type URL | → `/host` / loads / loads | ✔ |
| R-03 | P0 | `/admin/audit` | Type URL | → `/host` / → `/host` / loads | ✔ |
| R-04 | P0 | Settings content | Open Settings | — / Restaurant, Opening hours & rules, Guest feedback, Data export; **no** New venue / drawing / Accounts / New venue, Floor plan drawing, Accounts only | ✔ |
| R-05 | P0 | API settings reads (`GET /api/admin/venues/:id`, `/opening-hours`, `/closed-dates`) | DevTools/curl with session cookie | 403 / 200 / 200 | ✔ |
| R-06 | P0 | API settings writes (`PATCH`/`PUT`) | same | 403 / 200 / 200 (now all through `requireAdmin`) | ✔ |
| R-07 | P0 | `/api/admin/analytics`, `/api/admin/reservations`, `/api/admin/feedback`, `/api/admin/venues/:id/export` **(changed)** | same | 403 / 200 / 200 (the old `export.csv` path → 404, see X-13) | ☐ |
| R-08 | P0 | `/api/admin/users`, `/api/admin/venues` (list/create), `/api/admin/audit-log` | same | 403 / 403 / 200 | ☐ (venue admin ✔) |
| R-09 | P0 | Cross-venue access | Second venue: request its day view / guest / reservation / `table-availability` / `/admin/reservations?venueId=` / `/staff/venues/<id>/export` by ID | 403 for non-super users | ☐ (old rows ✔; table-availability, reservations and day export not run) |
| R-10 | P1 | Front-of-house works for host **(changed)** | Day view, walk-in, edit reservation, change table, status change, guest search/profile, day export (`/api/staff/venues/:id/export`) | All allowed | ☐ |
| R-11 | P1 | Venue admin can edit reservations | `PATCH /staff/reservations/:id` as `venueadmin` | Allowed (regression: was 403) | ✔ |
| R-12 | P1 | Role change takes effect | Change a role in Settings → Accounts; log in again | Nav/redirect match the new role | ✔ |
| R-13 | P1 | Dashboard for venue admin | `/admin` as `venueadmin` | Loads; no 403 on audit-log | ✔ |
| R-14 | P1 | Super admin Settings scope | Open Settings as super admin | Only New venue, Floor plan drawing, Accounts; no Restaurant, hours, feedback, export (UI only; API would still allow edits) | ✔ |

> **Diagrams match the code (updated 2026-11-08):** venue admins use Dashboard + Settings + Floor plan (not Accounts or Audit); the super admin Settings page shows only venue creation, the drawing and Accounts, and has the Audit log. API `requireAdmin` still lets a super admin edit venue settings (see Known gaps).

---

## 4. Host journey — Today's service (`/host`)

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| H-01 | P0 | Day view | Open `/host` | Bookings grouped by time slot; per-group booking count + covers (cancelled/no-show excluded); header "N bookings · M active" correct | ✔ |
| H-02 | P1 | Date navigation **(changed)** | Previous / date picker / Next / Today | Order is Previous, DatePicker, Next, Today; Today is disabled when today is shown; list and header date update | ☐ |
| H-03 | P1 | Live refresh **(changed)** | Create a booking from `/bali/book` in another tab; then hide the `/host` tab for 1 min (DevTools → Network) | New booking appears within ~15 s, no reload; while the tab is hidden no `/api/staff/day` polls fire; polling resumes when visible | ☐ |
| H-04 | P1 | Reservation card content | Inspect a card | Guest name, Repeat chip, "N guests · area · **Table N / Tables N + M / No table** · code · source", occasion, status chip; alerts for allergies (red), accessibility (amber), guest note, internal note | ✔ |
| H-05 | P0 | Status happy path **(changed labels)** | pending → confirm → arrive → seat → complete | Primary button reads the action: **Confirm**, Arrived, **Seat**, **Complete**; destructive **Cancel** / No-show; buttons 44 px high; each step allowed; chip/counts update; audit event written | ☐ |
| H-06 | P0 | Invalid transitions | Via API: completed→seated, cancelled→confirmed, seated→no_show, same→same | 409; UI never offers them | ✔ |
| H-07 | P1 | Cancel / no-show allowed only from | Cancel: pending, confirmed. No-show: confirmed, arrived | Others not offered | ✔ |
| H-08 | P1 | Destructive confirm | Cancel / No-show | Prompt "Mark as Cancelled?" / "Mark as No-show?" with buttons "Yes, Cancelled" / "Yes, No-show" and "Keep booking"; Keep leaves status unchanged | ☐ |
| H-09 | P1 | Final states | completed, cancelled, no_show | "No further actions"; no Change table / reminder | ✔ |
| H-10 | P0 | Open guest from a card | Click guest name | `/guests/<id>` renders the profile | ✔ |
| H-11 | P1 | Feedback link | On a `completed` booking, "Send feedback via WhatsApp" | Opens wa.me with the template (`{{guestName}}`, `{{restaurantName}}`, `{{feedbackUrl}}` filled). **No `feedback_link.sent` audit event is written** (the link is client-only). A guest's later submission is audited as `feedback.submitted` (entity `feedback_link`); guest without phone → "This guest does not have a valid phone number." | ✔ |
| H-12 | P1 | Empty day | Day with no bookings | "No bookings for this day." (filters hidden) | ✔ |
| H-13 | P2 | Tabs | Today's service ↔ Guest search (underline tabs) | Content swaps; filters only on Today's service; no console errors | ✔ |
| H-14 | P1 | Repeat chip | Guest with an earlier `completed` booking books again | "Repeat" chip on the new booking only, not on the first one; a guest with only cancelled/no-show history gets no chip | ✔ |
| H-15 | P1 | WhatsApp reminder | On a `pending`/`confirmed` card, "Send reminder via WhatsApp" | wa.me opens with "Hi <name>, this is a reminder of your reservation at <venue> today at <time> for N guests (ref <code>)…"; button hidden for other statuses; no phone → error banner. **Known quirk: the text says "today" even when the host is viewing another date** | ✔ |
| H-16 | P1 | Status + Source filters **(changed)** | In the tab bar: each Status value; each Source (`website`, `instagram`, `google`, `whatsapp`, `walk_in`, `phone`, `host`); combine both | Only matching cards; both filters AND together; "No bookings match these filters." when none; header counts unchanged; filters persist across date changes | ☐ |
| H-17 | P1 | Day export **(changed)** | Export CSV for a day | Export viewer (U-09) with "Date: <date>"; columns booking_code, guest_name, phone, email, party_size, date, time, status, allergies, accessibility, **nationality**, that day only; Download → `gioi-reservations-<date>.csv`; allowed for host | ☐ |
| H-18 | P2 | Change table button | Look at cards per status | "Change table" only for pending, confirmed, arrived, seated | ✔ |

### 4.1 Walk-in modal

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| W-01 | P0 | Create walk-in **(changed)** | "+ Walk-in": name, optional phone, party, time, area, source, **nationality (required)**, occasion, notes | Created **confirmed in one call** (`status: 'confirmed'`, one status event `null → confirmed`); appears in the list; a failed create leaves nothing behind | ☐ |
| W-02 | P1 | Date follows the host's day | Move `/host` to tomorrow, open "+ Walk-in" | Title "Add walk-in · <that date>"; booking is created on the selected day, not today | ✔ |
| W-03 | P1 | Required fields **(changed)** | Empty name; whitespace-only name; empty phone; empty nationality | Empty name/nationality: browser `required` blocks submit. Whitespace-only name: "Name is required."; nationality spaces only: "Nationality is required." (nothing created). Phone is optional: walk-in without phone creates a **new** guest each time | ☐ |
| W-04 | P0 | Capacity checked **(changed path)** | Walk-in into a full slot/area; walk-in with no area picked when all areas are full; an area with `max_party` below the party | Rejected with message (409 `full` / 422); no overbook. With no area the server uses the same smallest-fit picker as public bookings, so area party limits now apply to walk-ins too | ☐ |
| W-05 | P1 | Hours checked | Time outside opening hours | Rejected "outside opening hours" | ✔ |
| W-06 | P1 | Past / lead-time rules | Today: open the time picker; via API post a past time | UI: times before now (rounded up to 5 min, **browser clock, not the venue's WITA zone**) are disabled and a too-early value is pulled up; API still allows past/lead-time times | ✔ |
| W-07 | P0 | Pick one table | Pick a free 4-seat table for party 2, Add walk-in | Area select switches to that table's area; "1 table, 4 seats for 2 pax"; host card shows "Table N" | ✔ |
| W-08 | P0 | Join tables | Party 6: pick two tables in one area that sum ≥ 6 | "2 tables, N seats for 6 pax"; card shows "Tables N + M" | ✔ |
| W-09 | P1 | Table rules | Pick tables summing < party, submit; pick a third table that isn't needed; pick a table in another area | "Chosen tables seat X, party needs Y." (blocked); "Tables already seat X for Y pax. Deselect one to swap." (not added); other area replaces the selection | ✔ |
| W-10 | P0 | **Takeover of a late holder** | Book table N at a time T (status confirmed); after T + grace, open a walk-in at T on table N | Table N is pickable; warning "<guest> booked T and hasn't arrived; taking this table marks <guest> as no-show."; on save the old booking becomes `no_show` (status event reason "table taken over by walk-in", audited) | ✔ |
| W-11 | P0 | Held table blocked | Same before T + grace, or holder `arrived`/`seated` | Table dimmed and not pickable; tooltip shows holder name + time; forcing via API → 409 `table taken` | ✔ |
| W-12 | P1 | Table taken during edit | Another device books the chosen table first, then submit | "table taken"; selection cleared; map refreshed | ✔ |
| W-13 | P2 | Modal reset + Esc | Fill, close (Esc / backdrop / Close), reopen | All fields reset (time 19:00, source Walk-in, no tables, nationality empty) | ✔ |
| W-14 | P1 | Nationality field **(new)** | Focus Nationality; pick "Unknown / prefer not to say"; save. `POST /staff/reservations` without `country` and with `"country":" "` | First option is "Unknown / prefer not to say" and is accepted; stored on the guest; API 400 "country is required" (or schema) for both | ☐ |
| W-15 | P2 | Floor plan freshness **(new)** | Open `/host`; in another tab move/add a table in Floor plan and Save; open Walk-in and Change table without reloading; then reload `/host`; switch venue as super admin | The modals show the plan loaded when `/host` opened (new table missing) until reload; after reload, or a venue switch, the new plan shows. No extra `/floor-plan` request when opening either modal | ☐ |

### 4.2 Change table modal

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| C-01 | P0 | Open | Change table on a card with a table | Modal shows "<guest> · N guests · time"; current table(s) preselected; every table held by anyone else in the window is dimmed (no takeover here) | ✔ |
| C-02 | P0 | Move | Pick a different free table that fits, "Change table" | Saved; card label updates; audit `reservation.updated` | ✔ |
| C-03 | P1 | Join / unjoin | Large party: pick two tables; then back to one bigger table | Both persist; redundant third table refused with the swap message in the UI (API: 422 `too many tables for the party`) | ✔ |
| C-04 | P1 | Save guard | Open and click nothing; deselect all; pick tables that don't cover the party | "Change table" disabled in all three | ✔ |
| C-05 | P1 | Move to another area | Pick a table in a different area | Reservation's area changes too (host card + dashboard); moving into a full area → 409 `full` (capacity is now checked on every area/size/time change) | ✔ |
| C-06 | P1 | Race | Two hosts move two bookings onto the same free table | Second gets "table taken"; its selection clears and states reload | ✔ |
| C-07 | P1 | Booking without a table | Change table on a "No table" card | Nothing preselected; picking a table assigns it | ✔ |
| C-08 | P2 | Reslot keeps tables valid **(changed)** | `PATCH /staff/reservations/:id` with a new `startsAt` / `partySize` / `seatingAreaId` on a booking that holds a table; also `partySize` 0, 101, `"4"` | Allowed only if its tables are still free and big enough; otherwise 409 `table taken` / 422 `tables are too small` / 422 `table is not in that seating area` / 422 `too many tables for the party`. A booking with no tables is only area-capacity checked. `partySize` outside 1–100 or not an integer → 400 (schema) | ☐ |

---

## 5. Host journey — Guests (`/host` tab + `/guests/:id`)

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| S-01 | P0 | Search finds any guest | Type `me` (guest "Mega Putri" is not in the first 8 alphabetically) | Listed with phone, `N visits`, badges | ✔ |
| S-02 | P1 | Search fields | Name fragment, phone digits, email fragment | All match, case-insensitive (phone stored as `+62 812-…`: search by a digit run that includes the dash formatting, e.g. `812-345`) | ✔ |
| S-03 | P1 | Min length | 0–1 chars | "Type at least 2 characters."; no request | ✔ |
| S-04 | P1 | Max 8 results | Query matching >8 guests | 8 rows | ✔ |
| S-05 | P1 | No results | `zzzzz` | "No guests match." | ✔ |
| S-06 | P1 | Fast typing | Type quickly then change query | Debounced; final list matches final query | ✔ |
| S-07 | P0 | Profile renders | Click a result | `/guests/<id>`: contact (+ country), allergies, accessibility, seating preference, internal notes, visits/cancelled/no-show counts, visit history newest first (sorted by the API now) | ✔ |
| S-08 | P1 | Visit feedback | Visit with feedback | "Guest feedback: x/5", comment, "Stood out: …" | ✔ |
| S-09 | P1 | Profile is read-only | Look for edit controls | None | ✔ |
| S-10 | P1 | Back button | host → guest → Back; admin → guest → Back; direct URL → Back | Returns to origin; direct load falls back to `/host` (host) or `/admin` (admin) | ✔ |
| S-11 | P1 | Visit pagination | Guest with >10 visits | 10/page, Previous/Next, "Page x of y" (hidden when 1 page) | ✔ |
| S-12 | P0 | Other venue's guest | `/guests/<id from another venue>` as host | No data (403 / not found) | ✔ |
| S-13 | P1 | Unknown id | `/guests/00000000-0000-0000-0000-000000000000` | "Guest not found." | ✔ |
| S-14 | P1 | Super admin search scope | Super admin selects venue B in the header, searches a guest that exists only in B | B's guest found, A-only guests not; changing the header venue re-runs a typed query | ✔ |

---

## 6. Admin journey — Dashboard (`/admin`)

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| D-01 | P0 | Loads | Open as admin | All panels render; no console errors | ✔ |
| D-02 | P1 | Range presets **(changed)** | today / 7 / 30 / custom (From/To use the shared `DatePicker`); force bad ranges via the URL (`?preset=custom&from=2026-11-10&to=2026-11-01`, a 400-day range) and via API (`from=2026-1-1`) | Numbers + labels update; `last7` = today−6…today, `last30` = today−30…today (31 days); no client-side check: API 400 "from must be on or before to" / "range must not exceed 366 days" shown inline above the panels; malformed dates → 400 (schema pattern) | ☐ |
| D-03 | P1 | Filters **(changed)** | Status ("table only"), Source, Occasion | Source/Occasion apply to Guest mix, Channel, Reliability, previous-period deltas (D-19) and the table. **Status only narrows the table** and is no longer sent to `/admin/analytics` (D-20). Today live, Next 7/30 days, cues, Guest feedback and Turn time ignore the filters (feedback and turn time follow the range only). The Source list omits `chope_import`; Occasion options are every occasion booked in the range (server `occasionOptions`) plus the current selection | ☐ |
| D-04 | P1 | Action cues | Slot over capacity, no-show rate high, repeat guest with allergies | Cue appears when its condition is met; "Open guest →" / "Open host view →" go to the right place | ✔ |
| D-05 | P1 | Today live | Bookings, expected covers, arrived, seated, completed, no-shows/cancellations, fill % | Expected covers matches the host's active covers; **Bookings counts every status** (host header excludes cancelled/no-show); Arrived/Seated are cumulative (arrived includes seated and completed) | ✔ (cancelled/no-show day not checked) |
| D-06 | P1 | Next 7 / 30 days | covers/day, fill %, busiest slot, peak day | **Booked covers, not a forecast** (pending, confirmed, arrived, seated, completed). 7 days: bars with `(fill%)` and Busiest slot. 30 days: line chart, "N covers · avg X/day · peak N on <day>", see D-16 | ✔ |
| D-07 | P1 | Guest mix, channels, reliability **(changed: SQL)** | first-timers vs repeats, occasions, party buckets; channel share %; no-show %, cancel %, avg lead time. Compare with a hand SQL count for the range | No NaN / undefined. Now computed in Postgres with the same rules: first-timers / repeats = guests with 1 / >1 bookings in the period that reached arrived, seated, completed or no_show; occasion covers and party buckets (1–2, 3–4, 5–6, 7–8, 9+) from arrived/seated/completed; channel shares exclude cancelled and may not sum to 100; reliability excludes `pending`; lead time only for bookings made before their start. Total guests is a venue-wide count | ☐ |
| D-08 | P1 | Guest feedback panel **(changed)** | avg rating, distribution, top tags, latest; range with > 10 responses | Header "N responses · X/5 average", distribution and top 8 tags cover **every** response submitted in the range (no 200-row cap); list shows the newest 10, **Load more** appends 10 (D-22); unaffected by Status/Source/Occasion; click opens the detail modal (Esc, Close or backdrop closes; "Open guest profile →") | ☐ |
| D-09 | P1 | Reservations table search **(changed)** | name / code / phone; then a filter change | Search runs on the server (250 ms debounce) over booking code and guest name (case-insensitive) and phone (substring; not email); count reads "N reservations"; a filter summary line appears when any filter or search is set; analytics panels do not refetch on search | ☐ |
| D-10 | P1 | Reservations pagination **(changed)** | >10 matches; go to page 3; change a filter or the search | 10/page from `/api/admin/reservations` (`limit=10&offset=…`), newest first; changing filters/search jumps back to page 1; dimmed while loading; on phones "Swipe sideways for more columns"; API failure → "Could not load reservations." | ☐ |
| D-11 | P1 | Export CSV **(changed)** | Click Export CSV in the table header; also with 0 matches | Button shows "Preparing…", fetches every matching row (filters + search, max 5000) and opens the Export viewer (U-09) with the filter summary; columns booking_code, guest_name, phone, email, **nationality**, party_size, date, time, area, source, status, allergies, accessibility; Download → `gioi-reservations-<from>_<to>.csv`; button disabled with 0 matches | ☐ |
| D-12 | P2 | Empty range | Range with no data | Empty states, no NaN | ✔ |
| D-13 | P1 | New venue, no data | Dashboard on a venue with zero reservations | Zeros/empty states; no NaN, no "Invalid Date", no 500 | ✔ (found + fixed: "peak 0 on Invalid Date") |
| D-14 | P1 | API down on dashboard | Stop the API, reload `/admin` | The real error message shows (not "Invalid date range"); no crash | ☐ |
| D-15 | P1 | Turn time card | Dashboard with completed bookings; then a range with none | Full-width card, "range only": per area average minutes from Seated → Completed events in range, "N seatings · target M min" (target = venue `diningMinutes`, no Settings input yet); areas with no seatings are hidden; none at all → "No completed seatings in this range." | ✔ |
| D-16 | P2 | 30-day chart hover | Hover the chart; leave; move to the edges; reduced-motion on | Guide line, dot and tooltip (day, "N covers", "B bookings · P% full") follow the pointer and stay inside the card; axis shows day numbers with "d Mon" at the start and on the 1st; line draws in on load (instant under reduced motion) | ✔ |
| D-17 | P1 | Filters in the URL **(new)** | Set custom range, Source `instagram`, Status `confirmed`; reload; paste the URL in another tab; edit the URL to `status=bogus&preset=weird` | URL query carries `preset, from, to, status, source, occasion` (`router.replace`, no history spam); reload and the pasted link restore the same view; invalid values fall back to Last 30 days / All | ☐ |
| D-18 | P2 | Reset filters **(new)** | Change any filter or preset, type a search, click Reset filters | Button only shows when preset ≠ Last 30 days or a filter ≠ All; it restores defaults and clears the search; URL follows | ☐ |
| D-19 | P1 | Previous-period deltas **(new)** | Last 7 days with bookings in both this and the previous 7 days; then a range whose previous window equals it | Channel card: "+N (P%) vs prev period" after bookings and covers (muted). Reliability: no-show / cancellation "± X.X pts vs prev period", red when worse, accent when better. Previous window = same length immediately before the range, same Source/Occasion. Equal values show no delta | ☐ |
| D-20 | P2 | Refetch scope **(new)** | DevTools → Network: change Status only; then Source; then switch venue (super admin) | Status → only `/api/admin/reservations`. Source/Occasion/range → one `/api/admin/analytics` (debounced 250 ms) + reservations page 1. Venue switch → both. Filter card dims while analytics loads | ☐ |
| D-21 | P1 | `/admin/reservations` API **(new)** | As venue admin: no `from`; `from>to`; 400-day range; `limit=5001`; `status=bogus`; `q` 101 chars; `occasion=No occasion`; as host; with another venue's `venueId` | 400 schema / "from must be on or before to" / "range must not exceed 366 days" / 400 / 400 / 400; "No occasion" matches empty and null occasions; host 403; other venue 403 (super admin 200); response `{ total, rows }` with `guestCountry` | ☐ |
| D-22 | P1 | Feedback paging API **(new)** | Range with 25 responses: Load more twice; `GET /api/admin/feedback` without `from`, with `cursor=garbage`, from another venue | 10 + 10 + 5, newest first, no duplicates, button disappears at the end ("Loading…" while busy); API 400 schema / 400 "invalid cursor" / 403 | ☐ |

## 7. Admin journey — Settings (`/admin/settings`, every save audited)

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| T-01 | P0 | Load | Open as venue admin and super admin | Venue admin: Restaurant, Opening hours & rules, Guest feedback, Data export. Super admin: New venue, Floor plan drawing, Accounts (for the venue chosen in the header) | ✔ |
| T-02 | P0 | **Restaurant** | Edit tagline/intro/address/maps URL/phone/WhatsApp/policy → Save restaurant | "Saved at …"; persists; shown on `/bali`; audit `settings.updated` with only changed fields | ✔ |
| T-03 | P1 | Name read-only | Restaurant name | Disabled (not in the API whitelist) | ✔ |
| T-04 | P1 | **Opening hours & rules** | Hours per weekday (12-hour TimePicker), booking interval, party min/max, lead time, cut-off, table hold grace, no-show target, over-capacity alert %, closed dates (shared `DatePicker`; add with "+ Add", Enter no longer adds) → Save hours & rules | Public availability follows each; grace drives W-10; each weekday lands on the same weekday on `/bali` (G-02). There is no `diningMinutes` field (it is in the API whitelist; Turn time shows it as the target) | ✔ |
| T-05 | P1 | **Guest feedback** | Title, subtitle, WhatsApp template (tags field is read-only) → Save | Template used by the host's feedback link; title/subtitle (and venue name) shown on `/bali/feedback/<code>`, falling back to the defaults when empty | ✔ |
| T-06 | P1 | **Seating areas** | Moved to the floor plan editor (F-13 to F-22) | Settings has no Seating areas card | ✔ |
| T-07 | P1 | **Accounts** (super admin) | See 7.1 (T-13…T-28) | Replaced by the Venues/Accounts scenarios | ✔ |
| T-08 | P0 | **Data export** **(changed)** | "Download reservations CSV" | Opens the Export viewer (U-09) with "No filters (all reservations)"; columns id, booking_code, guest_name, phone, email, party_size, date, time, status, allergies, accessibility, **nationality**; Download → `gioi-export-<venueId>.csv`; API `GET /api/admin/venues/:id/export` returns JSON `{ columns, rows }`, 403 for hosts; failure → "Export failed." | ☐ |
| T-09 | P1 | Save is diffed | Change one field, save | Audit event lists only the changed field(s) | ✔ |
| T-10 | P1 | Failed save | Stop the API, Save | "Save failed…" message, no silent success | ☐ |
| T-11 | P1 | Concurrent edit | Two tabs edit the same card | Last save wins; no crash; no stale data after reload | ☐ |
| T-12 | P2 | Validation | Negative numbers, min > max party, bad time ranges | Rejected with a clear message ("… must be a non-negative integer", "party size limits are invalid") | ✔ |
| T-29 | P1 | Grace validation | Grace = -1, 121, 7.5 via the field or API | 422 "graceMinutes must be an integer between 0 and 120"; 0 and 120 accepted | ✔ |
| T-30 | P1 | Maps URL validation | Maps URL `javascript:alert(1)`, `ftp://x`, empty, `https://maps.app.goo.gl/…` | 422 "mapsUrl must be an http(s) URL" for the first two; empty and https accepted | ✔ |
| T-31 | P1 | Special notice settings **(changed)** | Enable notice → Notice date, Event time, Event name, Popup headline, Popup message (textarea) appear; save; disable | Persisted (`noticeTitle`, `noticeText`, `noticeEventName`, `noticeEventTime`); enabling with no date → 422 "noticeDate is required when the notice is enabled"; bad date → 422; booking page follows (G-55…G-60) | ☐ (old fields: API ✔) |
| T-32 | P1 | Event slot fields **(new)** | Fill only Event name; only Event time; both; `PATCH` `noticeEventTime: "7pm"`, `"19:30"`, `null`, `""` | One without the other: the time field turns red (`aria-invalid`) but Save still succeeds and no event slot appears (G-59). API: `"7pm"` → 422 "noticeEventTime must be HH:MM or null"; the other three accepted. Audit `settings.updated` lists `noticeEventName` / `noticeEventTime` / `noticeTitle` changes | ☐ |
| T-33 | P2 | Notice headline migration **(new)** | On a DB before `0010`, set `notice_text = '*****NYE POLICY***** Pay in full.'`; apply `0010_venue_notice_title` | `notice_title = 'NYE POLICY'`, `notice_text = 'Pay in full.'`; texts without the `*…*` prefix keep `notice_title = ''` | ☐ |

### 7.1 Super admin: venues and accounts (Settings + header venue select)

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| T-13 | P0 | Create venue | Settings → New venue → name + slug → Create venue | Page reloads; new venue is selected in the header; audit `venue.created`; blank details for its admin to fill | ✔ |
| T-14 | P1 | Slug rules | Uppercase, spaces, duplicate slug | Rejected (form pattern / 400 / 409 "venue slug already exists"); nothing created | ✔ |
| T-15 | P1 | Switch venue | Change the header venue select | Accounts list and drawing reload for that venue only; choice survives reload | ✔ |
| T-16 | P0 | Add account | Accounts → name, login, password (12+), role → Add account | Listed; user can log in; lands on `/admin` (admin) or `/host` (host); sees only that venue | ✔ |
| T-17 | P1 | Login rules | Duplicate login; login typed with capitals/spaces | 409 "login already exists"; stored trimmed + lowercase; login form accepts any case | ✔ |
| T-18 | P1 | Password length | Password under 12 chars | Blocked in the form; API 400 | ✔ |
| T-19 | P1 | Edit account | Change name, login, role → Save accounts | Persists; role effective on next login; audit `user.updated` | ✔ |
| T-20 | P0 | Reset password | Type a new password → Save accounts | New password works, old fails; that user's open sessions get 401; blank field keeps the old password | ✔ |
| T-21 | P1 | Deactivate | Untick Active (larger checkbox) → Save | User signed out on next request; cannot log in | ✔ |
| T-22 | P0 | Remove | Remove (red button) → confirm; also test Cancel on the prompt | Cancel changes nothing; confirm removes from the list; user with no other venue cannot log in; audit `user.removed` | ✔ (audit entry not checked in the UI) |
| T-23 | P1 | Super admin hidden | Look at the Accounts list | The super admin's own row is not listed | ✔ |
| T-24 | P1 | Empty states | No venues; venue with no accounts | No header select; Settings shows only New venue; "No admin or host accounts for this venue yet." | ☐ (no-accounts half ✔; zero-venue state not run) |
| T-25 | P0 | API authorization | As host / venue admin / logged out: `GET`/`POST /api/admin/venues`, `POST`/`PUT /api/admin/users`, `DELETE /api/admin/users/:id?venueId=` | 403 / 403 / 401; `DELETE` on a super admin id → 404; bad UUID → 400 | ✔ |
| T-26 | P0 | Venue admin first run | Log in as the new venue admin on a blank venue | Settings loads; fill Restaurant, hours; Floor plan: add areas + tables; `/<slug>` shows them (needs a `VENUE_SEO` entry for the landing page, see Known gaps); multi-venue isolation holds (R-09) | ✔ (Restaurant only; hours/seating not filled) |
| T-27 | P1 | No spaces in logins | Create or edit a login containing a space, or only spaces | 422 "login must not contain spaces"; leading/trailing spaces are trimmed | ✔ |
| T-28 | P1 | Rename to an existing login | Edit an account's login to another user's login → Save | 409 "login already exists"; renaming to its own login is a no-op | ✔ |

### 7.2 Super admin venue selector (header)

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| V-01 | P0 | Select shows all venues | Log in as `admin` | Header select lists every venue by name; "(slug)" is appended only when two venues share a name; first venue selected when nothing stored (API order is by name only) | ✔ |
| V-02 | P0 | Host follows the venue | On `/host`, switch venue | Day view reloads for that venue (`/staff/day?date&venueId`); floor plan reloads; walk-in, change table, day export use that venue | ✔ |
| V-03 | P0 | Dashboard follows the venue | On `/admin`, switch venue | Analytics and the reservations table refetch with `venueId`; numbers match that venue | ✔ |
| V-04 | P1 | Persistence **(changed, was ✘)** | Switch, reload, sign out and in | Same venue (stored as `gioi.venueId`, now written via `auth.setSelectedVenueId` on change); a stored id for a deleted venue falls back to the first venue | ☐ |
| V-05 | P1 | Not shown to others | Log in as `venueadmin`, `host` | No venue select | ✔ |
| V-06 | P1 | Storage blocked | Private window with storage blocked | Page still works; selection just isn't remembered | ☐ |
| V-07 | P1 | Guest search / audit scope | Switch to venue B, then Host → Guest search and `/admin/audit` | See S-14; Audit shows only the selected venue's events and reloads on switch (`?venueId=` in the URL still wins) | ✔ |
| V-08 | P2 | Mobile header | 390 px as super admin | Select (max 14 rem, truncates), theme button, Sign out and logo fit without overflow | ☐ |

### 7.3 Floor plan and seating (`/admin/floor-plan`, Settings → Floor plan drawing)

Seed gives `admin` (super admin and venue admin of Bali) and `venueadmin` (venue admin only). To test "super admin without venue admin rights", create a second venue as `admin`.

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| F-01 | P0 | Drawing upload (super admin) | Settings → pick a venue in the header → Floor plan drawing → upload `apps/api/prisma/floor-plans/bali.svg` → Remove drawing | Preview shows the drawing; Remove asks for confirmation and clears it; audit `floor_plan.image_uploaded` / `floor_plan.image_removed` | ✔ |
| F-02 | P0 | Drawing rules | `PUT /admin/venues/:id/floor-plan/image` as venue admin; with a `text/html` data URL; with an image and no width/height; file > 3 MB in the UI | 403 "super admin required"; 422 "drawing must be an SVG, PNG, JPEG or WebP under 3 MB"; 422 "width and height are required with an image"; "Drawing must be under 3 MB."; plan height follows the aspect ratio (bali.svg → 1525) | ✔ |
| F-03 | P0 | Who can open the editor | Open `/admin/floor-plan` as host, venue admin, super admin | Host → `/host`; super admin → redirected to `/admin/settings` (no nav link; it only uploads drawings); venue admin sees nav "Floor plan", the Add row, selected-item bar, plan, area list with table counts and total seats. A venue admin of several venues edits only the first | ✔ |
| F-04 | P1 | Add table, chairs, Revert | Click Terrace in the area list → `+ Table in Terrace` → + chair ×2 | New table in that area, 4 → 6 seats; unsaved indicator shows; Revert restores the saved layout | ✔ |
| F-05 | P0 | Save layout sets capacity | Save a layout with tables in an area | Area capacity = sum of seats; survives reload; audit `floor_plan.updated` | ✔ |
| F-06 | P1 | Capacity is never typed | Settings and Floor plan as venue admin | No capacity input anywhere; the side panel's seats per area are the capacity | ✔ |
| F-07 | P1 | Capacity follows tables on every save | Remove all tables of an area, save; add them back, save | Capacity goes to 0, then to the new seat sum | ✔ |
| F-08 | P0 | Layout needs venue admin | `PUT …/floor-plan/layout` as host; as super admin on a venue where they are not admin | 403 "venue admin required" both; `GET …/floor-plan` as that super admin → 200, `canEdit: false` | ✔ |
| F-09 | P1 | Layout validation | Save a table with an unknown area id; one at x = 99999; a table `id` that doesn't exist | 422 "unknown seating area"; 422 "item is outside the floor plan"; 422 "unknown table" | ✔ |
| F-10 | P1 | Public plan is safe | `GET /api/public/venues/bali/floor-plan` | Only width, height, image, areas, tables, objects; tables carry id, seatingAreaId, seats, x, y, rotation; no guest or booking data | ✔ |
| F-11 | P2 | Editor controls | Drag, arrow nudge (Shift ×10), `R` rotate, `+`/`−` chair, Delete key / button | Each updates the plan; clamped inside the plan | ✔ |
| F-12 | P2 | New drawing keeps positions | Replace the drawing with a different aspect ratio | Tables keep their positions; any outside the new box are clamped when the editor loads | ✔ |
| F-13 | P0 | Create an area | Floor plan → + Add area → name "Rooftop" → **+ Add table** in the panel → + chair → Save layout | Area listed with 1 table and 5 seats; DB row has capacity 5, no party limits, bookable; survives reload | ✔ |
| F-14 | P0 | Delete an area with reservations | Pin an area that has a booking (Sunset Terrace) → Delete area → Save layout | Save fails with "Sunset Terrace has reservations and cannot be deleted"; Revert brings it back; nothing changed in the DB | ✔ |
| F-15 | P1 | Delete an empty area | Pin Rooftop (no bookings) → Delete area → Save layout | Area and its tables gone after save and reload | ✔ |
| F-16 | P1 | No tables means no capacity | Save with an area that has no tables (Terrace) | Area stays in the list with 0 seats; its capacity is 0 so it takes no bookings; save succeeds | ✔ |
| F-17 | P1 | Settings has no seating card | Settings as venue admin; `GET`/`PUT /api/admin/venues/:id/seating-areas` | No "Seating areas" card; both routes return 404 | ✔ |
| F-18 | P1 | Area name and party rules | Duplicate names (case-insensitive), empty name, min > max (via API) | 422 "area names must be unique" / "area name is required" / "minParty must not exceed maxParty" | ✔ |
| F-19 | P0 | Area drives where tables go | Select Terrace in the area list | Toolbar reads `+ Table in Terrace`; with no area selected the button is disabled with a tooltip; clicking a table on the plan selects its area | ✔ |
| F-20 | P1 | Selected-item bar | Click nothing, a table, then an object | Empty: hint. Table: "Selected table **N** in <area>", Chairs − N +, Rotate, Delete, no Area dropdown. Object: label, W, H, Rotate, Delete | ✔ |
| F-21 | P1 | Area list reads clearly | Look at the area list | Heading "Areas"; each row "N table(s) · M seats"; only the selected row is strongly highlighted; Delete area is red | ✔ |
| F-22 | P0 | No party limits in the UI | Select an area, save a layout, then check `seating_areas` | No Min/Max party inputs; after save `min_party` and `max_party` are NULL for every area | ✔ |
| F-23 | P0 | Table ids are stable | Book table 3; move it on the plan and save; delete table 5 (no bookings) and save | The booking still holds the same table (host label unchanged except for numbering); deleting a table that a booking holds makes that booking "No table" | ✔ |
| F-24 | P1 | Table numbering | Compare numbers on the editor, booking map, walk-in map and host card | Same number everywhere (position in the plan's table list order, not area order); numbers shift when an earlier table is deleted | ☐ (partial ✔) |
| F-25 | P2 | Phone warning **(new)** | Open Floor plan at 390 px, then ≥ 768 px | Below `md` a note "Editing table positions works best on a larger screen…" shows above the plan; hidden from 768 px | ☐ |

## 8. Audit log (`/admin/audit`, super admin)

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| L-01 | P1 | Events recorded | Status change, settings save, users save, floor plan save, drawing upload, venue created, user created, user removed, walk-in takeover (no-show), guest feedback, guest cancel | One event each with actor, entity, time. Only some have friendly text; the rest show the raw action (`floor_plan.updated`, `venue.created`, `user.created`, `user.removed`, `settings.updated`, `feedback.submitted`). `user.updated` is one event per save with no per-field changes. `feedback_link.sent` is not produced | ☐ (partial ✔) |
| L-02 | P1 | Newest first | Inspect order | Newest at top | ✔ |
| L-03 | P1 | Filter | Entity dropdown: reservations / status changes / settings / seating areas / feedback links | List narrows; page clamps. There is no venue or user type: `venue.*` / `user.*` events appear only under "All events". Floor plan saves are under "Seating areas"; drawing upload/remove under "settings"; "Feedback links" = guest `feedback.submitted` | ✔ |
| L-04 | P1 | Pagination | >25 events | 25/page, Previous/Next (API returns the latest 100) | ✔ |
| L-05 | P1 | Empty state | Fresh DB | Friendly message | ☐ |
| L-06 | P0 | Access | Host / venue admin | Redirect + API 403 | ✔ |

---

## 9. UI / cross-cutting

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| U-01 | P1 | Staff theme toggle **(changed)** | host/admin pages | Theme button sits in the app header next to Sign out (no floating button on staff pages); smooth cross-fade incl. header; persisted; staff default dark when unset | ☐ |
| U-02 | P1 | Responsive **(changed, was ✘)** | 390 / 768 / 1280 on every page (incl. walk-in and change-table modals with the map, Export viewer) | No unintended horizontal overflow; mobile nav is a second row; modals scroll within the viewport; tap targets ≥ 44 px. Since the last run: status buttons 44 px, map tables ≥ 44 px hit area, theme button 44 px; still 40 px: Sign out, nav links; check filter selects and "Open guest →" again | ☐ |
| U-03 | P1 | Keyboard | Tab through login, booking, host list, modals, phone/country comboboxes, time picker, Export viewer | Visible focus, logical order, Esc closes modals and listboxes. Last run: walk-in / change-table modals take no focus and are not trapped; one Esc closes listbox **and** modal | ✘ |
| U-04 | P2 | Reduced motion **(changed)** | OS setting on | Theme switch, map fade-in/ring/badge, GSAP hero, FAQ disclosure, signature zoom, 30-day line draw and tooltip all instant | ☐ |
| U-05 | P1 | Console clean | Walk every page | No uncaught errors/hydration warnings. Last run: dev hydration mismatch on `/`, `/bali`, `/privacy` (theme-toggle `title`, SVG path); PostHog "initialized without a token" in dev | ✘ |
| U-06 | P1 | API down | Kill API mid-session | Error states, not a blank page or endless "Loading…". Last run: staff pages redirect to `/login`; `/bali/book` shows "Venue not found." | ✘ |
| U-07 | P1 | Host-based routing | `book.*`: `/login`, `/host`, `/admin`, `/guests/x` · site host: `/bali/book`, `/bali/confirmation/x`, `/bali/feedback/x` · localhost / `*.vercel.app`: everything | 404 · 301 to `book.*` (same path) · all routes served (see `server/middleware/host-routes.ts`) | ☐ |
| U-08 | P2 | Time zone | Booking near midnight (Asia/Makassar) | Same date/time on confirmation, host, admin, `.ics`, exports | ✔ |
| U-09 | P1 | Export viewer **(new)** | Open any export (T-08, D-11, H-17); untick columns; Show more; Download; Esc / backdrop / Close | Modal "Export reservations" with "<filter summary> · N rows · x/y columns"; sticky header with a checkbox per column (unticked columns grey out); first 50 rows, "Show more" adds 50; Download writes only ticked columns, button reads "Downloaded ✓" ~1.8 s; disabled with 0 columns; Esc, backdrop and Close close it; file opens in Excel/Sheets with UTF-8 names intact | ☐ |
| U-10 | P2 | DatePicker on phones **(new)** | 390 px: open the DatePicker on `/host`, Dashboard custom range, Settings closed dates and notice date | Panel opens as a full-width overlay under the header (not clipped by the card); on ≥ 640 px it drops down under the field; outside click and Esc close | ☐ |

## 10. Security smoke (browser DevTools / curl)

| ID | P | Check | Expected | Status |
|---|---|---|---|---|
| X-01 | P0 | Every `/api/staff/*` and `/api/admin/*` call with no cookie | 401 | ✔ |
| X-02 | P0 | Replay an old cookie after logging in elsewhere | 401 | ✔ |
| X-03 | P0 | Public booking lookup response | No phone/email/internal notes | ✔ |
| X-04 | P1 | XSS: guest name/notes `<img src=x onerror=alert(1)>`; notice headline/message with HTML | Rendered as text on host, profile, admin, audit, walk-in tooltip, WhatsApp text, Export viewer, notice popup | ☐ (old surfaces ✔; tooltip, WhatsApp, Export viewer, notice popup not run) |
| X-05 | P1 | SQL-ish search `' OR 1=1 --` in guest search and the dashboard search | Treated literally | ☐ (guest search ✔; dashboard server search new) |
| X-06 | P1 | Tamper UUIDs (reservation/guest/venue/table from another venue) | 403/404/422 only | ✔ (table ids not run) |
| X-07 | P1 | Garbage or oversized bodies to public booking | 4xx, never 500 | ✔ |
| X-08 | P1 | Error shape / headers | `{ error, message }`; no stack traces | ✔ |
| X-09 | P0 | CSV formula injection **(changed)** | Book with name `=HYPERLINK("http://x","y")`, `+1`, `-1`, `@x`; Download from Settings, Dashboard and Host export viewers | Escaping now happens in the browser (`utils/csv.ts` `toCsv`); cells starting with `= + - @` (after spaces), tab or CR start with `'`; stored phones `+62 …` are therefore `'`-prefixed; commas/quotes/newlines quoted. The JSON export APIs return raw values (consumers must escape) | ☐ |
| X-10 | P1 | Public table availability leaks nothing | `GET /api/public/venues/bali/table-availability?date&time&partySize` | Only `unavailableTableIds`; no names/codes. Staff version (`/api/admin/venues/:id/table-availability`) needs a session and venue access | ✔ |
| X-11 | P1 | Prod security headers **(changed)** | `curl -I https://gioigroup.com/bali` | HSTS `max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, Referrer-Policy, Permissions-Policy, COOP, CSP (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'self'`); site still works under CSP (PostHog via `/ingest`, external CSS now that inline styles are off); `/logo-96.webp`, `/logo-480.webp` immutable cache | ☐ |
| X-12 | P2 | Dev server binding | Start web dev without `NUXT_DEV_HOST` | Listens on `127.0.0.1` only | ✔ |
| X-13 | P1 | Removed / renamed routes **(new)** | `GET /api/admin/venues/<id>/export.csv`, `/api/staff/venues/<id>/export.csv?date=…`, `/api/staff/reservations/<id>/next-statuses`; then the new `/export` routes as host, venue admin, other-venue user | Old three → 404. `/api/admin/venues/:id/export`: host 403, venue admin 200 JSON `{ columns, rows }`. `/api/staff/venues/:id/export?date=`: host 200, missing `date` 400, other venue 403 | ☐ |

## 11. Bootstrap, production and CI

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| B-01 | P0 | Venue-only bootstrap | `DATABASE_URL=… ADMIN_LOGIN=admin npx tsx prisma/create-super-admin.ts` (no `ADMIN_PASSWORD`) on a DB with an admin and no venue | Prints `super admin ready: admin, venue: bali`; admin password unchanged; `GET /api/public/venues/bali` 200; safe to run twice | ✔ (local DB) |
| B-02 | P1 | Bootstrap guards | Unknown `ADMIN_LOGIN` without password; `ADMIN_PASSWORD` shorter than 12 | Both stop with a clear error. Password-length check writes nothing; the unknown-login case runs the venue upsert first, so a missing venue can still be created | ☐ |
| B-03 | P0 | No venue yet (prod symptom) | Log in as super admin on a DB with no venue | Host waits for a venue (empty day); Dashboard shows empty data or a real error; Settings shows New venue, not a blank page | ☐ |
| B-04 | P1 | Re-login after bootstrap | Run the script while logged in, reload | Venue appears in the header select (list loads once per page load) | ☐ |
| B-05 | P1 | Empty-venue public page | Open `/<slug>` for a venue with blank address/phone/hours | Page renders without crash if the slug has a `VENUE_SEO` entry; otherwise 404 without an API call (P-14) | ☐ (rule changed) |
| B-06 | P1 | CI | Push to a PR | Postgres 17 service; setup pnpm, install, prisma generate, `nuxt prepare`, typecheck, `pnpm test` (excludes `__tests__/db`, so DB tests do not run in CI), prisma validate | ☐ (steps ✔ locally; GitHub run pending) |
| B-07 | P0 | Prod migrations **(changed)** | Deploy | `0004_reservation_table`, `0005_venue_grace_minutes`, `0007_venue_notice`, `0008_reservation_tables`, `0009_venue_event_slot`, `0010_venue_notice_title` applied by the owner role; existing bookings keep working with "No table"; existing notices keep their text (T-33) | ☐ |
| B-08 | P2 | Health check **(new)** | `GET /health` with the DB up, then with the DB unreachable; watch Neon compute while an uptime monitor pings it | `{ "status": "ok" }` both times: it no longer queries the DB (so Neon can sleep) and **no longer proves DB connectivity**; use a real API call (e.g. `GET /public/venues/bali`) for a DB check | ☐ |

---

## Known gaps worth a ticket (not scenarios)

> **Fixed and committed in `eb5bb08` (re-run the rows):** marketing consent saved (G-58), staff capacity checks on edit + walk-in (C-05, W-04), walk-in confirmed in one call (W-01), notice only on its date + date required (G-55, T-31), feedback page uses Settings (T-05), duplicate CTA/footer removed (G-30), dashboard export = shown rows (D-11), super admin guest search + audit follow the header venue (S-14, V-07). `35f29c2` reworked `/admin/analytics` (no `guests` array, guest fields on rows, range-scoped feedback, Turn time). Migration `0008_reservation_tables` must be applied by `gioi_owner`, not `gioi_app`.
>
> **Since the 2026-11-12 run (re-run the rows):** venue select persistence (`c3230b8`, V-04); pinia 3 + `@pinia/nuxt` 0.11 and the `VENUE_SEO` slug check before the API call (`a3bdadb`, P-05, P-14); weekday mapping of opening hours on `/bali` and in JSON-LD (`1c957e5`, G-02, P-04); `/privacy` removed from the sitemap (P-08); tap targets partly raised (U-02).
>
> **DB tests (`gioi_test`) on 2026-11-12:** 18/18 pass, incl. the new capacity/walk-in/notice test. Two stale tests were fixed: public bookings now send `tableId` (not `tableIds`), and the takeover test opens the venue 00:00–24:00 for its run so it no longer fails before 10:00 / after 22:00. Not re-run against the 2026-11-17 code (the working tree also deletes `apps/api/src/__tests__/csv.test.ts` together with `lib/csv.ts`).

- Guest cancel exists only as an API; no button on the confirmation page (per customer diagram).
- `feedback_link.sent` is never audited by `apps/` (the host's WhatsApp feedback/reminder buttons are client-only).
- Expired notices are switched off only when a venue admin opens Settings (harmless: the notice applies only on its own date).
- The notice popup opens on **every** booking-page load while a notice is upcoming, not only when the notice date is picked (G-55); confirm this is intended.
- Event name without time (or the reverse) saves without an error; only the time field turns red, and no event slot appears (T-32).
- Landing pages come from `VENUE_SEO` in code: a venue created in Settings has no `/<slug>` page until a code change (it now 404s before any API call).
- The NYE promo (`components/NyePromo.vue`) is hard-coded: copy, poster, end time and an absolute `book.gioigroup.com` link (leaves localhost in dev). Review ratings on the Visit buttons are hard-coded in `VENUE_SEO`.
- `/host` loads the floor plan once per venue; walk-in and change-table maps miss layout edits until the page is reloaded (W-15).
- Exports: the API returns JSON and CSV formula escaping happens only in the browser; the dashboard export silently stops at 5000 rows.
- `PATCH /staff/reservations/:id` caps `partySize` at 100 regardless of the venue's `partyMax`.
- Venue page quick-book uses the browser date for "today"; the booking page uses the venue (WITA) date (G-03, G-61).
- CSP still allows `challenges.cloudflare.com` although Turnstile was removed.
- Migration numbering skips `0006`.
- Login rate limiting is in-memory per serverless instance; needs a shared store for real brute-force protection.
- Sessions have a fixed 7-day life (no sliding expiry).
- Pagination: the dashboard reservations table (`limit`/`offset`) and feedback list (cursor) page on the server; guest visits and the audit log still page in the browser (audit API returns the latest 100).
- `/health` no longer checks the DB (B-08); uptime monitors pointed at it cannot see a DB outage.
- Settings hides venue sections from the super admin in the UI only; the API still lets a super admin edit venue settings.
- No hard delete of users: "Remove" unlinks from the venue and deactivates when no venue is left (audit rows reference users).
- No venue rename/delete, and no email field in Settings (email is only set at bootstrap/seed).
- Public staff-login link was removed from the landing footer; `/login` is reachable by URL only.
- Host reminder text always says "today", even for another date; walk-in "not before now" uses the browser clock, not the venue zone.
- Settings has no `diningMinutes` input although Turn time uses it as the target.
- Dashboard Source filter omits `chope_import`; `cancellation_rate_high` cue is declared but never produced.
- `book.*/privacy` is not redirected (`vercel.json` exclusion list).
- Auto-picked area for a public booking or walk-in ignores table availability, so it can land on "No table".
- A booking page reload plus resubmit creates a second booking (idempotency key is per click).
- Public booking and confirmation pages show "Venue not found." / "couldn't find that booking code." for any API failure (U-06).

## Run notes (2026-11-07, managed Chromium + curl, dev DB)

- ✘ **D-11** Export CSV button in the dashboard table has no handler (use Settings → Data export). *(Handler added since; re-run D-11.)*
- ✘ **G-12** Confirm is disabled until name/phone are valid; there are no inline error messages. *(Inline errors added since; re-run G-12.)*
- ✘ **U-05** Dev-only `Hydration completed but contains mismatches` on `/bali` (cause not isolated).
- ☐ not run: G-05, G-15b (no Turnstile key), G-17, G-28, G-29, H-04, L-05, S-11 (no guest with >10 visits), T-10, T-11, U-02 (no overflow at 390/768/1280; tap-target count not reviewed), U-03, U-04, U-06 (API down: pages show "Venue not found." / "couldn't find that booking code" instead of an unavailable state).
- A-13 verified on a temp API with `CORS_ORIGIN` set: foreign Origin → 403, same origin → 200.

## Run notes (2026-11-07, later: venues/accounts, localhost browser run)

Managed Chromium (the user's Chrome relay was unusable: the relay on :9224 and this OMP session were different versions) against local web `:3000` + local API `:3001` + dev DB. Accounts and venues created by the run (`qa-mw6ffk7e`, `qava…`) remain in the dev DB, deactivated where possible (audit rows block deleting them). No prod access.

- ✔ run in the browser: G-30, R-04 (venue admin + super admin), R-14, T-01, T-07, T-13 to T-17 (dup login 409 shown in the UI), T-18, T-20 to T-23, D-13, B-05.
- ✔ run through the API: T-25 (host / venue admin / anon / super admin edge cases), T-27, T-28.
- ☐ partial or not run: T-16 (host landing page, venue isolation), T-19 (role change, audit entry), T-24 (zero-venue state), T-26 (hours and seating not filled), D-14, B-02 (password-length guard), B-03 (zero-venue DB), B-04, B-06 (GitHub run), L-01 (audit entries for `venue.created` / `user.created` / `user.removed` not viewed in the Audit page), R-08 (`/api/admin/audit-log` not re-run).
- **Found and fixed during this run:**
  - D-13: the new-venue dashboard showed "peak 0 on Invalid Date" (empty peak date). The peak is now shown only when there is one.
  - T-27: logins with spaces inside were accepted (`qaadminm  qahostr…`). They now return 422.
  - T-28: renaming a login to an existing one returned 500. It now returns 409.
- **Behaviour to remember when testing:** logging in as a user through the API replaces that user's browser session (single device per user, A-07). Use a separate user, or log in again after API calls.

## Run notes (2026-11-09, seating map and floor plan, localhost browser + curl, dev DB)

Managed Chromium against web `:3000`, API `:3001`, Docker Postgres `gioi-pg`. Layout used: 11 tables over Main Hall (2), Sunset Terrace (3), Chef's Counter (3), Beachfront Lounge (3), Terrace (0); capacities are the table seat sums (6 / 14 / 6 / 16), Terrace keeps its manual 14.

- ✔ run: G-31 (shown half), G-32 to G-42 (G-37 and G-42 partly), F-01 to F-10.
- ☐ not run: G-31 (hidden when the plan has no tables), G-42 light mode, G-43 (no non-bookable area in the seed), F-11 (drag and rotate; Delete button ✔), F-12.
- **Found and fixed during this run:**
  - The table popup used a hardcoded white background, so its text was unreadable in dark mode. It now uses the theme tokens.
  - For a table smaller than the party the popup said "we'll pair nearby tables", which the system doesn't do (booking is area-level). It now says the party is seated in the area, not at this exact table.
- **Dev DB fixes needed to run this:** the dev DB had no `0002_floor_plan` tables (applied the SQL as `gioi_owner`; `prisma migrate deploy` still fails with P3005 because the DB was never baselined), and `venueadmin` was missing (now in `prisma/seed.ts`).
- Data left in the dev DB: bookings `GIOI-H9UEX2WC` (Sunset Terrace) and one Main Hall booking from G-39, venue `qa-floor` (drawing removed), 11 demo tables.
- The map is a guide only: a booking stores the seating area, never a table. *(No longer true from 2026-11-10: bookings hold tables via `reservation_tables`; see 1.2a.)*

## Run notes (2026-11-09, later: seating areas moved into the floor plan editor)

- ✔ run: F-13 to F-18 (browser + curl), `pnpm test:db` (13 passing, incl. the area create / capacity / delete test and the "table points at an unsent area" 422), `@gioi/domain` tests.
- Areas are now created, renamed, limited and deleted in `/admin/floor-plan`; the Settings "Seating areas" card and `GET`/`PUT /admin/venues/:id/seating-areas` are gone. Capacity is only ever the seat sum.
- Needs migration `0003_seating_area_zero_capacity` (an area with no tables has capacity 0). Applied to `gioi` and `gioi_test` as `gioi_owner`; prod needs `pnpm prisma:migrate` or the SQL run by the owner role.
- **Found and fixed:** `slot_over_capacity` would have shown "Infinity%" for an area with bookings and capacity 0; it now reports 100%.
- **Side effect to remember:** the first layout save on an existing venue sets every area to its seat count, so areas with a typed capacity and no tables drop to 0. In the dev DB, Terrace is now 0.
- Test setup: `gioi_test` also lacked `0002_floor_plan`; applied by hand.

## Run notes (2026-11-09, floor plan UX pass: area-driven toolbar, no party limits)

Managed Chromium (1440×1000, then 390×844) against web `:3000`, API `:3001`, dev DB, as `venueadmin`.

- ✔ run in the browser: F-03 (venue admin view), F-04, F-06, F-11 (rotate buttons, `R`, arrows, `+`, `Delete`, drag), F-13 to F-16, F-19 to F-22; no horizontal overflow at 390 px; no console errors. `pnpm --filter web typecheck` clean.
- **UI changes covered:** the toolbar's area dropdown is gone (the selected area drives `+ Table in <area>`); the bar under it shows the selected table or object with Chairs, Rotate and Delete; the area panel holds Name, "Guests can book this area", `+ Add table`, Delete area; Min/Max party inputs were removed.
- **Found and fixed during this run:** the area list said "1 tables"; the empty-selection hint still mentioned changing a table's area.
- **Side effect to remember:** the first layout save clears every area's `min_party` / `max_party` (the editor sends `null`). In the dev DB, Beachfront Lounge (min 2) and Chef's Counter (max 4) now have no limits, so G-35 and G-40 in 1.2a need those limits re-set by SQL or API before re-running. The API and booking check still enforce limits when present.
- Data left in the dev DB: Chef's Counter has 4 tables / 16 seats from earlier runs; Terrace has 0 tables.

## Run notes (2026-11-12, parallel agent run, managed Chromium + curl, dev DB)

Four agents ran the ☐ rows against web `:3000` / API `:3001` / dev DB (accounts `qa-host2`, `qa-host3`, `qa-va1`, `qa-va2`, password `qa-password-12345`, were created for it). The parent reviewed the failures and spot-checked them. **Status marks in the tables above are not flipped yet; use this list.**

- **PASS:** P-01, P-03, P-04, P-07, P-08, P-09, P-12; G-04, G-05, G-06, G-12, G-15, G-15b, G-16, G-17, G-20…G-22, G-24, G-27, G-28, G-29, G-30, G-33, G-35, G-38, G-39, G-42, G-44…G-48, G-51…G-56, G-58; A-01, A-02, A-03, A-06, A-09, A-14, A-15 (host); R-04, R-08 (venue admin side), R-10; H-02, H-04, H-11, H-14…H-18; W-01…W-13; C-01…C-08; S-02, S-11, S-14; D-02, D-03, D-05…D-08, D-11, D-15, D-16; T-01, T-04, T-05, T-13, T-15, T-16, T-19, T-24 (no-accounts half), T-29, T-30, T-31 (API); V-01…V-03, V-05, V-07; F-03, F-09, F-12, F-20, F-23, F-24 (partial); L-01 (partial); X-09, X-10, X-12; U-01, U-04.
- **FAIL:**
  - **V-04 (bug, fixed in the working tree):** the header venue select wrote `auth.selectedVenueId` through `v-model`, so `localStorage` `gioi.venueId` was never updated after the first load. It now calls `auth.setSelectedVenueId` on `change` (`app.vue`). Re-run V-04.
  - **P-05 (bug):** `/nope` returns HTTP 500 "obj.hasOwnProperty is not a function" instead of the 404 page. The 404 is thrown correctly (`useVenueSeo.ts:17`), then the error page's SSR payload fails in `@pinia/nuxt` `payload-plugin.js` → `shouldHydrate` (pinia 2.3.1 calls `obj.hasOwnProperty` on a null-prototype object that the `useFetch` error state carries). Likely fix: upgrade `pinia` / `@pinia/nuxt`, not yet done. The same 500 appears for any unknown path (`/dashboard`, `/settings`).
  - **U-02 (tap targets):** Sign out, nav links and row action buttons are 40 px high; filter selects 33 px; "Open guest →" ~17 px; booking-map tables 18 px at 390 px. The ≥ 44 px expectation does not hold.
  - **U-03:** Walk-in and Change-table modals take no focus and are not trapped (focus stays on the opener; no `role="dialog"`/`aria-modal`); one Esc closes the combobox/time-picker listbox **and** the modal.
  - **U-05:** the dev hydration mismatch (theme-toggle `title`, SVG path) is on `/`, `/bali` and `/privacy`; PostHog "initialized without a token" logs on every page (dev).
  - **U-06:** with the API stopped, `/admin`, `/host` and `/admin/settings` redirect to `/login` (an outage looks like a sign-out); `/bali/book` shows "Venue not found."; no "service unavailable" state.
  - **G-03 / P-02 (environment):** in dev the SSR of `/bali` fetches `NUXT_PUBLIC_API_BASE`, which defaults to `https://gioi-api.vercel.app` (production data: Thu–Sat hours to 22:30, party select 1–20). Set `NUXT_PUBLIC_API_BASE=http://127.0.0.1:3001` in `apps/web/.env` to test local data. P-06 cannot be tested in dev for the same reason.
  - **P-11:** the dev server does not 301 `/bali/`; check on prod.
- **BLOCKED / not run:** P-06, P-10, G-23, G-26 (need a completed booking), G-31 (empty-plan venue), G-43 (no non-bookable area), G-40, G-49 flip case, B-01…B-04, D-14, T-10, T-11, T-24 zero-venue half, U-07 (site-host 301: `bookUrl` is empty in dev), X-11.
- **Doc corrections found:** P-11 (prod only); G-25 (dev DB has empty `feedbackTags`, so the 4-tag fallback shows); G-45 (changing the party clears the time); W-09 (the old "Tables already seat…" message stays next to the new one); table numbering follows the floor-plan list order, not area order; Closed dates list in Settings shows existing dates as raw ISO strings (`2026-01-01T00:00:00.000Z`) while new ones show `2026-11-20`; V-01 "first venue" depends on API order (`/admin/venues` orders by name only, so same-name venues swap); D-05 "Bookings counts cancelled/no-show" and cumulative Arrived/Seated need a day with such bookings to verify.
- **Data issues in the dev DB:** floor-plan table 2 has y=1330 on a 1200-high plan (off-canvas, untappable in the walk-in and change-table maps); `QA-*` bookings/guests on 12–21, 25 and 26 Nov; venue `qa-admin-zt696b` with users `qaadm-h2-zt696b` / `qaadm-h3-zt696b`. Bali notice settings, grace, maps URL, feedback title/subtitle and closed dates were restored.
- **Run hazards:** the managed Chromium shares one cookie jar per host, so concurrent agents logged each other out; use a different hostname (`localhost` vs `127.0.0.1`) per agent. The default `node` on PATH is now 26.7.0 and crashes (missing `libsimdjson`); start the dev servers with node@22.
