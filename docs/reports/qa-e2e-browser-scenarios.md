# GIOI — QA E2E Browser Scenarios

Manual (or Playwright-ready) browser scenarios for `apps/web` + `apps/api`.
Derived from the journey diagrams in [`docs/design/diagrams/`](../design/diagrams) (`customer-journey`, `host-journey`, `admin-journey`) and the code as of **2026-11-12 (`35f29c2` plus the uncommitted `/admin` UI pass)**; audited statically against `apps/` on that date (not re-run in a browser). Floor plan behaviour is specified in [`floor_plan_seating.md`](../design/floor_plan_seating.md). Run on a clean seeded database.

**Priority:** P0 = release blocker, P1 = must pass before launch, P2 = polish.
**Status:** `☐` not run, `✔` pass, `✘` fail (link the bug). Rows whose behaviour changed after the last run were reset to `☐` and carry **(changed)**.

## What changed since the 2026-11-09 run

| Area | Change | Scenarios |
|---|---|---|
| Public site | `/` is now a group landing page (no redirect to `/bali`); venue page has SEO meta, JSON-LD, FAQ, menus PDFs, Privacy link; `/privacy`, `/sitemap.xml`, `/llms.txt`; custom error page | P-01…P-12, G-01, G-30 |
| Hosts | `book.*` serves only the booking flow; the site host 301s booking routes to `book.*`; the old `admin.*` rule is gone | U-07, P-09, P-10 |
| Booking form | Email is required; country (optional) combobox; phone input with country code; inline name/phone errors; Turnstile replaced by a honeypot; `?src=` booking source; special notice gate | G-04, G-12, G-15b, G-50…G-58 |
| Tables | Bookings now hold real tables (`reservation_tables`). The guest can choose one table; the server auto-assigns the smallest free table that fits; staff can join several tables | G-33, G-44…G-49, W-07…W-13, C-01…C-08 |
| Grace / takeover | Venue `graceMinutes` (default 15). A walk-in may take a table from a `pending`/`confirmed` holder who is past start + grace; that holder becomes `no_show` | W-10, W-11, T-29 |
| Host | Walk-in uses the selected day (not always today), optional phone, 12-hour time picker, table picking; Change table modal; WhatsApp reminder; status filter; day CSV export; table label and Repeat chip on cards | H-04, H-11, H-14…H-18, W-01…W-13, C-* |
| Super admin | Header venue selector (persists in `localStorage` `gioi.venueId`) drives Host, Dashboard and Settings | V-01…V-08, T-01, T-13, T-15, T-24 |
| Dashboard | Export CSV now works; area filter removed (Range, Status, Source, Occasion); shared pagination component | D-03, D-11 |
| Security | CSV formula-injection escaping; `mapsUrl` must be http(s); JSON-LD `<` escaped; prod security headers + CSP (vercel.json) | X-09…X-12, T-30 |

## 0. Setup

| Item | Value |
|---|---|
| Web | `http://localhost:3000` (Nuxt dev; `/api/**` proxies to `127.0.0.1:3001`; `bookUrl` is empty in dev so booking links stay on localhost) |
| API | `http://127.0.0.1:3001` (`pnpm --filter api dev`) |
| DB | Migrations `0001`…`0008` applied (there is no `0006`), then seeded (`pnpm --filter api prisma:seed`) |
| Super admin | `admin` / `password` (isSuperAdmin; seed also links it to Bali as venue `admin`). Picks the working venue in the header select |
| Host | `host` / `password` (venue role **`host`**; confirm in Settings → Accounts before testing) |
| Venue admin | `venueadmin` / `password` (seeded; not super admin, venue role `admin`) |
| Tables | **The seed creates no tables.** As `venueadmin`, open Floor plan and add tables in at least 3 areas (mix of 2-, 4- and 6-seat), Save layout. Needed by G-31…G-49, W-07…W-13, C-* |
| Browsers | Desktop Chrome at 100%, plus mobile 390×844. Run the public booking flow (G-*) in both |
| Two-device tests | Two separate browser profiles (or normal + incognito) |

Reset between runs: re-seed, or `TRUNCATE venues, users CASCADE` on the **test** DB only.

> The DB integration tests must run against `gioi_test`. If `TEST_DATABASE_URL` is exported pointing at the dev DB they fail.

## Diagram coverage map

| Diagram stage | Scenarios |
|---|---|
| Public site, SEO, hosts | P-01…P-12 |
| Customer 1 Discover `/bali` | G-01…G-03 |
| Customer 2 Book `/bali/book` | G-04…G-15b, G-50…G-58 |
| Customer 2a Seating map + table choice | G-31…G-49 |
| Customer 3 Confirmation | G-16…G-21 |
| Customer 4 Feedback | G-22…G-27 |
| Host 1 Sign in | A-01…A-14 |
| Host 2 Today's service + status machine | H-01…H-18 |
| Host 3 Walk-in (+ tables, takeover) | W-01…W-13 |
| Host 3a Change table | C-01…C-08 |
| Host 4 Guests | S-01…S-14 |
| Admin 1 Sign in / role gate | A-02, A-03, R-* |
| Admin 2 Dashboard | D-01…D-14 |
| Admin 3 Settings (+ every save audited) | T-01…T-12, T-29…T-31 |
| Audit log | L-01…L-06 |
| Super admin venues, accounts, venue selector | T-13…T-28, R-14, V-01…V-08 |
| Bootstrap, prod, CI | B-01…B-06, D-13 |
| Floor plan & seating (admin) | F-01…F-22, T-06 |

---

## 1. Customer journey (public, no login)

### 1.0 Public site, SEO and hosts

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| P-01 | P0 | Group landing | Open `/` | Group page "GIOI Group" lists every venue in `VENUE_SEO` (image, title, description, city/region); each card links to `/<slug>`; Privacy link; no redirect | ☐ |
| P-02 | P1 | Venue page sections | Open `/bali`, scroll | Hero + quick-book, Experience scenes, Menu highlights, Visit (address, Get directions, menu PDFs, WhatsApp, phone, Instagram), Hours with live WITA clock, FAQ (expands), CTA "Reserve a table" | ☐ |
| P-03 | P1 | Menu PDFs | Click each menu button | `/menus/bali-menu.pdf` and `/menus/bali-alcohol-menu.pdf` open in a new tab | ☐ |
| P-04 | P1 | SEO meta | View source of `/bali` | `<title>`, description, canonical `https://gioigroup.com/bali`, og:image (OG jpg), twitter card; JSON-LD `Restaurant` (address, geo, hours, `acceptsReservations`, `ReserveAction`) and `FAQPage`; venue text with `<` is escaped (`<`) | ☐ |
| P-05 | P1 | Unknown venue | Open `/nope` | Custom error page: "404 · This page does not exist."; button goes back to `/bali`; `noindex` | ☐ |
| P-06 | P2 | API down on venue page | Stop the API, open `/bali` (SSR) | 503 error page ("Something went wrong"), not a soft 404 | ☐ |
| P-07 | P1 | Privacy page | Open `/privacy` from the footer | Renders; prerendered | ☐ |
| P-08 | P2 | Crawl files | `GET /robots.txt`, `/sitemap.xml`, `/llms.txt` | robots disallows `/login /host /admin /guests /ingest`; sitemap lists `/`, each venue, `/privacy`; llms.txt lists venues, menus, booking links (markdown) | ☐ |
| P-09 | P1 | Booking pages are noindex | Response headers of `/bali/book`, `/bali/confirmation/<code>`, `/bali/feedback/<code>` | `X-Robots-Tag: noindex` | ☐ |
| P-10 | P1 | Host redirects (prod/preview with real hosts) | `book.gioigroup.com/` · `book.gioigroup.com/bali` · `gioigroup.com/bali/book` · `book.gioigroup.com/admin` | → `gioigroup.com/` (302) · → `gioigroup.com/bali` (301) · → `book.gioigroup.com/bali/book` (301) · 404 | ☐ |
| P-11 | P2 | Trailing slash | `/bali/` | 301 → `/bali` | ☐ |
| P-12 | P2 | Theme script | Set dark, reload `/bali` | No light flash before hydration (head script reads `gioi-theme`) | ☐ |

### 1.1 Discover — `/bali`

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| G-01 | P0 | Landing loads **(changed)** | Open `/bali` (and `/` → P-01) | Hero, experience scenes, visit & hours render; no console errors. `/` no longer redirects to `/bali` | ☐ |
| G-02 | P1 | Visit & hours | Check address, Get directions, WhatsApp, call links, live WITA clock, 7-day opening hours | Values match venue settings; links valid; clock is Asia/Makassar | ✔ |
| G-03 | P1 | Quick-book → booking **(changed)** | Choose date (today … +90 days, closed dates disabled) and Guests (select of party min…max), Find a table; repeat with `/bali?src=instagram` | Lands on `/bali/book?date=…&party=…` pre-filled; with `src` the query also carries `src=instagram` | ☐ |

### 1.2 Book — `/bali/book`

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| G-04 | P0 | Happy path **(changed)** | **1 When** (14-day strip, party stepper, optional table on the map, see 1.2a) → time grid → **2 Who** (name, phone with country code, **email**, optional country) → **3 Details** → accept cancellation policy → Confirm booking | Redirect to `/bali/confirmation/<code>`; booking is `pending`; shows on `/host` with a table label (auto-assigned or chosen) | ☐ |
| G-05 | P1 | Date strip on mobile | 390px viewport | First pill has a left gutter (not flush to the edge); strip scrolls and snaps; "More dates" picker works | ☐ |
| G-06 | P1 | Time grid states **(changed)** | Look at Lunch / Afternoon / Sunset / Dinner groups across days | Slots show `N left` **only when 2 or fewer remain**, `Full`, `Too soon` (past, lead time or cut-off), or `Closed`; unavailable ones not selectable | ☐ |
| G-07 | P1 | Closed day / closed date | Pick a closed weekday or a date in Settings → Closed dates | Pill disabled or all slots `Closed` | ✔ |
| G-08 | P0 | Capacity (no overbooking) | Fill a slot to capacity from two tabs | Last slot becomes `Full`; API never exceeds capacity | ✔ |
| G-09 | P0 | **Slot race** | Tab A and B select the same last slot; B confirms first, then A confirms | A sees "That time just filled up. Pick another slot above."; selected time is cleared; grid refreshes; no booking created for A | ✔ |
| G-10 | P1 | Party-size bounds | Stepper at `partyMin`/`partyMax`; tamper via API | UI blocks; at max a "Groups over N? Message us on WhatsApp" link shows; API 422 | ✔ |
| G-11 | P1 | Lead time and cutoff | Today's slots inside `leadTimeMinutes` / after `cutoffMinutes` | Shown `Too soon` / not offered | ✔ |
| G-12 | P1 | Required fields **(changed, was ✘)** | Blur empty name and phone; leave email empty; type an invalid email | "Enter your full name." / "Enter a WhatsApp / phone number…" under the fields; summary prompt "Enter full name, phone & email"; browser blocks submit on empty/invalid email; API without `email` → 400; nothing created | ☐ |
| G-13 | P1 | Details (optional) | Occasion, dietary pills + free text, accessibility, special requests (300-char counter) | Stored; allergies merged into the guest's list; visible on host card and guest profile | ✔ |
| G-14 | P1 | Policy gate | Try to confirm without accepting the cancellation policy | Blocked | ✔ |
| G-15 | P1 | Idempotency **(changed)** | Double-click Confirm | Exactly one reservation (the button is disabled while submitting). **A reload and resubmit creates a second booking**: the idempotency key is generated per click, so the server key replay only protects an identical retry | ☐ |
| G-15b | P1 | Honeypot (replaces Turnstile) **(changed)** | Fill the hidden `website` input via DevTools, submit; or `POST` with `"website":"x"` | 200 with a random code; **no** reservation, guest or audit row created; opening that code's confirmation shows "We couldn't find that booking code." | ☐ |

### 1.2a Seating map and table choice on the booking page

Guests pick a **table** on the venue map. Choosing it sets the seating area **and** sends that `tableId`; the server checks the table is free and seats the party. Without a choice the server picks an area, then the smallest free table in it that seats the whole party (or no table when none fits). After a time is picked, `GET /api/public/venues/<slug>/table-availability` greys out tables that are held in that window or are smaller than the party. **Party limits are not editable in the floor plan editor and are cleared by the first layout save**; set them by SQL/API before running G-35 and G-40.

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| G-31 | P1 | Map visibility | Open `/bali/book`, then a venue whose plan has no tables | Map ("Pick a table area") sits between Guests and Time; no Seating pills; with no tables there is no map and the booking still works | ☐ (shown ✔; empty-plan case not run) |
| G-32 | P0 | Tap a table | Click any table | Dialog opens with the area name, "Table for N" and a fit message; table gets a ring | ✔ |
| G-33 | P0 | Choose a table **(changed)** | Choose a 4-seat Sunset Terrace table (party 2) | Dialog closes; table fills orange with a check badge; "Selected: Sunset Terrace" under the map; other areas fade; slots refetch with `area=<id>`; summary Seating shows the area | ☐ |
| G-34 | P1 | Clear | Open the chosen table | Buttons are Close and Clear; Clear → no table, no area, summary "Any available table" | ✔ |
| G-35 | P1 | Fit rules **(changed copy)** | Before picking a time: party 6, open a Chef's Counter table (max 4); open a 2-seat Main Hall table | Chef's Counter: "Not available for a party of 6 (up to 4)", Choose disabled. 2-seat: "This table seats 2. Your party of 6 will be seated in Main Hall, and our host will join 3 tables for you, not at this exact table." Choose enabled | ☐ |
| G-36 | P1 | Dismiss | Esc; click the backdrop; Close | Each closes the dialog and keeps the selection unchanged | ✔ |
| G-37 | P1 | Keyboard | Tab to a table, Enter / Space | Dialog opens; Esc closes; focus ring visible; disabled tables are skipped (no tabindex) | ✔ (Enter + Esc; focus ring not eyeballed) |
| G-38 | P0 | Book with a chosen table **(changed)** | Choose a table, pick a time, fill Who, accept policy, Confirm | Confirmation Seating = that area; `/host` card shows "Table N" with the same number as on the map | ☐ |
| G-39 | P1 | Book without choosing **(changed)** | Same, but never open a table | Booking succeeds; server picks an area and the smallest free table that seats the party; host card shows "Table N" (or "No table" if none fits) | ☐ |
| G-40 | P1 | Party change drops a bad area | Choose Chef's Counter, raise party to 6 | Selection cleared automatically ("Selected:" gone) | ✔ |
| G-41 | P1 | Mobile 390×844 | Run G-32/G-33 | No horizontal overflow; map fits; dialog is a bottom sheet with readable buttons | ✔ |
| G-42 | P1 | Theme | Open the dialog in dark and light | Text and buttons readable in both | ☐ (dark ✔; light not run) |
| G-43 | P2 | Area not open for online booking | Table of an area with `bookable = false`; also `POST` a `tableId` from that area | "This area isn't open for online booking…", Choose disabled; API 409 `no_area` | ☐ (no such area in the seed) |
| G-44 | P0 | Held tables greyed | Book table 3 at 19:00 in tab A; in tab B pick the same date, 19:00, party 2 | Table 3 dimmed (35%), not focusable, not clickable; label says "(unavailable)"; other times within ± dining minutes also dim it | ☐ |
| G-45 | P1 | Small tables greyed | Party 5, pick a time | Every table with fewer than 5 seats is dimmed; if no table seats 5, no table can be chosen and the booking still works by area | ☐ |
| G-46 | P1 | Chosen table becomes unavailable | Choose a 2-seat table with no time picked, then raise party to 4 and pick a time | The table choice is dropped (no badge); the area stays selected | ☐ |
| G-47 | P0 | **Table race** | Tabs A and B choose the same table and time; B confirms, then A | A sees "That table was just taken. Pick another table."; choice cleared; map refreshes with that table dimmed; A's time is kept | ☐ |
| G-48 | P1 | Table API validation | `POST` with an unknown `tableId`; a `tableId` + `seatingAreaId` of another area; a table smaller than the party | 422 `unknown table` / `table is not in that seating area` / `tables are too small` | ☐ |
| G-49 | P2 | Tooltip | Hover a table with a mouse | Tooltip "<Area> · seats N · fits N / not for N / not bookable online"; flips below for tables near the top edge | ☐ |

### 1.2b Booking extras

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| G-50 | P1 | Phone input | Type `0812 345 678` with Indonesia; type `65` in the code box and pick Singapore; arrow keys + Enter in the list | Leading 0 stripped, digits grouped `812-345-678`; stored as `+62 812-345-678` / `+65 …`; list filters by dial code, name or ISO; Esc closes | ☐ |
| G-51 | P1 | Same guest by phone | Book twice with the same phone (once typed with a leading 0), different name/email | One guest row (dedupe on venue + phone); name/email updated to the latest; allergies merged, not replaced | ☐ |
| G-52 | P1 | Country | Pick a country in the combobox, book | Stored on the guest; shown on `/guests/<id>` ("· Australia") | ☐ |
| G-53 | P1 | Booking source | Book from `/bali/book?src=instagram`, `?src=google`, `?src=whatsapp`, `?src=bogus`, no `src` | Source `instagram` / `google` / `whatsapp` / `website` / `website` on the host card and dashboard channels | ☐ |
| G-54 | P1 | Source cannot claim staff channels | `POST` with `"source":"walk_in"` or `"host"` | 400 (schema enum) | ☐ |
| G-55 | P0 | Special notice gate **(changed)** | Settings: enable notice, date = a future day, text. Open `/bali/book`, then pick the notice date | Nothing on other dates. On the notice date the modal opens; "I have read and agree…" checkbox disabled until the modal is closed; Confirm disabled until ticked; prompt "Read and accept the special notice"; switching away and back resets the tick | ☐ |
| G-56 | P1 | Notice API rule | `POST` for the notice date without `noticeAccepted`; for another date without it | 422 "special notice must be acknowledged" / 201 | ☐ |
| G-57 | P1 | Notice expiry | Notice date in the past | Booking page shows no notice; opening Settings as venue admin turns `noticeEnabled` off and clears the date (audited) | ☐ |
| G-58 | P0 | Marketing consent (privacy) | Tick "Send me occasional news…" and book; book again with the same phone and the box unticked | Guest `marketing_consent = true` with `marketing_consent_at` set; profile shows "yes"; the unticked second booking does not withdraw it. **Was ✘ (checkbox never sent); fixed in the working tree 2026-11-12, re-run** | ☐ |

### 1.3 Confirmation — `/bali/confirmation/:code`

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| G-16 | P0 | Details + pending state | Land after booking | Shows status `pending`, code, date/time/party/area | ✔ |
| G-17 | P1 | Copy button | Click Copy next to the code | Code in clipboard; button reads "Copied" for ~1.5 s | ☐ |
| G-18 | P1 | Add to calendar | Click Add to calendar | `.ics` downloads; opens with the right title/time/WITA zone | ✔ |
| G-19 | P1 | Directions / WhatsApp | Click each | Correct maps URL and wa.me number | ✔ |
| G-20 | P0 | No PII on lookup | Open the URL in a fresh browser; call `GET /api/public/reservations/<code>` | No phone/email/internal notes/table ids; unknown code → "We couldn't find that booking code." | ✔ |
| G-21 | P1 | Cancel (API only) | **Diagram: no cancel button in the web UI yet.** `POST /api/public/reservations/<code>/cancel` for `pending`/`confirmed`; then for `arrived`/`seated`/`completed` and repeat | First → cancelled (visible on host view; its table is free again); others → rejected; a second cancel rejected. **If a button was added, add a UI scenario** | ✔ |

### 1.4 After the visit — `/bali/feedback/:code`

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| G-22 | P1 | Only completed | Open feedback for a non-completed booking, submit | Rejected (409) | ✔ |
| G-23 | P0 | Happy path | Complete a booking as host; open the feedback link; rate, pick tags, comment, submit | Saved; thank-you state; appears in Admin → Guest feedback | ✔ |
| G-24 | P1 | Stars required | Submit with no rating | "Please choose a rating." | ✔ |
| G-25 | P1 | Tags offered **(changed)** | Check tag list | Tags come from the venue's `feedbackTags` (seed: 8, e.g. Seafood freshness, Sunset view, Attentive service); falls back to Food, Service, Atmosphere, Value when the list is empty. The Settings tags field is read-only | ☐ |
| G-26 | P1 | One feedback per booking | Submit twice | Second rejected | ✔ |
| G-27 | P1 | Unknown code | `/bali/feedback/BADCODE` | "Booking not found", no crash | ✔ |

### 1.5 Public UI

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| G-28 | P2 | Theme toggle **(changed)** | Click the theme button | Smooth cross-fade (no per-element flicker); persists on reload; reduced-motion = instant. Follows the OS when unset **only on `/`, `/<venue>`, `/privacy`**; booking, confirmation and feedback pages default to dark and show a logo-only header | ☐ |
| G-29 | P2 | Theme button vs summary bar | Mobile `/bali/book` | Button sits above the sticky summary | ☐ |
| G-30 | P1 | Footer, no staff-login link **(changed)** | Scroll to the `/bali` footer | Order Visit → FAQ → CTA → footer, **one** footer (duplicate removed 2026-11-12): logo, "GIOI Ocean Gourmet · <address>", phone, Instagram handle, Privacy; no "Staff login"; `/login` still opens by URL | ☐ |

---

## 2. Authentication & session

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| A-01 | P0 | Host login | `host` / `password` | → `/host`; **no nav bar** (a single link hides it); chip "Host User · host" | ☐ |
| A-02 | P0 | Super admin login **(changed)** | `admin` | → `/admin`; nav Host, Dashboard, Settings, Audit (no Floor plan); chip reads "Super Admin" (the `· super admin` suffix shows only when the user's name differs from the role); venue select in the header | ☐ |
| A-03 | P0 | Venue admin login **(changed)** | `venueadmin` | → `/admin`; nav Host, Dashboard, Settings, Floor plan (no Audit); no venue select | ☐ |
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
| A-15 | P2 | Tab titles | Visit Host, Dashboard, Settings as each role | Title "<Page> · <Role> \| GIOI" (e.g. "Dashboard · Admin \| GIOI"); Host page as host: "Host \| GIOI" | ☐ |

## 3. Role-based access

Expected is shown as **host / venue admin / super admin**.

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| R-01 | P0 | `/admin` | Type URL | → `/host` / loads / loads | ✔ |
| R-02 | P0 | `/admin/settings` | Type URL | → `/host` / loads / loads | ✔ |
| R-03 | P0 | `/admin/audit` | Type URL | → `/host` / → `/host` / loads | ✔ |
| R-04 | P0 | Settings content | Open Settings | — / Restaurant, Opening hours & rules, Guest feedback, Data export; **no** New venue / drawing / Accounts / New venue, Floor plan drawing, Accounts only | ☐ (venue admin ✔, super admin ✔; host not re-run) |
| R-05 | P0 | API settings reads (`GET /api/admin/venues/:id`, `/opening-hours`, `/closed-dates`) | DevTools/curl with session cookie | 403 / 200 / 200 | ✔ |
| R-06 | P0 | API settings writes (`PATCH`/`PUT`) | same | 403 / 200 / 200 | ✔ |
| R-07 | P0 | `/api/admin/analytics`, `/api/admin/venues/:id/export.csv` | same | 403 / 200 / 200 | ✔ |
| R-08 | P0 | `/api/admin/users`, `/api/admin/venues` (list/create), `/api/admin/audit-log` | same | 403 / 403 / 200 | ☐ |
| R-09 | P0 | Cross-venue access | Second venue: request its day view / guest / reservation / `table-availability` by ID | 403 for non-super users | ✔ (table-availability not run) |
| R-10 | P1 | Front-of-house works for host | Day view, walk-in, edit reservation, change table, status change, guest search/profile, day CSV export | All allowed | ☐ (change table + day export new) |
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
| H-02 | P1 | Date navigation **(changed)** | Previous / Today / date picker (custom DatePicker) / Next | List and header date update | ☐ |
| H-03 | P1 | Live refresh | Create a booking from `/bali/book` in another tab | Appears within ~4 s, no reload | ✔ |
| H-04 | P1 | Reservation card content **(changed)** | Inspect a card | Guest name, Repeat chip, "N guests · area · **Table N / Tables N + M / No table** · code · source", occasion, status chip; alerts for allergies (red), accessibility (amber), guest note, internal note | ☐ |
| H-05 | P0 | Status happy path | pending → confirm → arrive → seat → complete | Each step allowed; chip/counts update; audit event written | ✔ |
| H-06 | P0 | Invalid transitions | Via API: completed→seated, cancelled→confirmed, seated→no_show, same→same | 409; UI never offers them | ✔ |
| H-07 | P1 | Cancel / no-show allowed only from | Cancel: pending, confirmed. No-show: confirmed, arrived | Others not offered | ✔ |
| H-08 | P1 | Destructive confirm **(changed)** | Cancel / No-show | Prompt "Mark as Cancelled?" / "Mark as No-show?" with buttons "Yes, Cancelled" / "Yes, No-show" and "Keep booking"; Keep leaves status unchanged | ☐ |
| H-09 | P1 | Final states | completed, cancelled, no_show | No further status buttons; no Change table / reminder | ✔ |
| H-10 | P0 | Open guest from a card | Click guest name | `/guests/<id>` renders the profile | ✔ |
| H-11 | P1 | Feedback link **(changed)** | On a `completed` booking, "Send feedback via WhatsApp" | Opens wa.me with the template (`{{guestName}}`, `{{restaurantName}}`, `{{feedbackUrl}}` filled). **No `feedback_link.sent` audit event is written** (the link is client-only). A guest's later submission is audited as `feedback.submitted` (entity `feedback_link`); guest without phone → "This guest does not have a valid phone number." | ☐ |
| H-12 | P1 | Empty day | Day with no bookings | "No bookings for this day." | ✔ |
| H-13 | P2 | Tabs | Today's service ↔ Guest search | Content swaps; no console errors | ✔ |
| H-14 | P1 | Repeat chip | Guest with an earlier `completed` booking books again | "Repeat" chip on the new booking only, not on the first one; a guest with only cancelled/no-show history gets no chip | ☐ |
| H-15 | P1 | WhatsApp reminder | On a `pending`/`confirmed` card, "Send reminder via WhatsApp" | wa.me opens with "Hi <name>, this is a reminder of your reservation at <venue> today at <time> for N guests (ref <code>)…"; button hidden for other statuses; no phone → error banner. **Known quirk: the text says "today" even when the host is viewing another date** | ☐ |
| H-16 | P1 | Status filter | Status select: each value | Only matching cards; "No bookings with this status." when none; header counts unchanged | ☐ |
| H-17 | P1 | Day CSV export | Export CSV for a day | `gioi-reservations-<date>.csv` with booking_code, guest_name, phone, email, party_size, date, time, status, allergies, accessibility for that day only; allowed for host | ☐ |
| H-18 | P2 | Change table button | Look at cards per status | "Change table" only for pending, confirmed, arrived, seated | ☐ |

### 4.1 Walk-in modal

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| W-01 | P0 | Create walk-in **(changed)** | "+ Walk-in": name, optional phone, party, time, area, source, nationality, occasion, notes | Created **confirmed in one call** (`status: 'confirmed'`, one status event `null → confirmed`); appears in the list; a failed create leaves nothing behind | ☐ |
| W-02 | P1 | Date follows the host's day **(changed)** | Move `/host` to tomorrow, open "+ Walk-in" | Title "Add walk-in · <that date>"; booking is created on the selected day, not today | ☐ |
| W-03 | P1 | Required fields **(changed)** | Empty name; whitespace-only name; empty phone | Empty name: browser `required` blocks submit. Whitespace-only: "Name is required." (nothing created). Phone is optional: walk-in without phone creates a **new** guest each time | ☐ |
| W-04 | P0 | Capacity checked | Walk-in into a full slot/area | Rejected with message (409/422); no overbook | ✔ |
| W-05 | P1 | Hours checked | Time outside opening hours | Rejected "outside opening hours" | ✔ |
| W-06 | P1 | Past / lead-time rules **(changed)** | Today: open the time picker; via API post a past time | UI: times before now (rounded up to 5 min, **browser clock, not the venue's WITA zone**) are disabled and a too-early value is pulled up; API still allows past/lead-time times | ☐ |
| W-07 | P0 | Pick one table | Pick a free 4-seat table for party 2, Add walk-in | Area select switches to that table's area; "1 table, 4 seats for 2 pax"; host card shows "Table N" | ☐ |
| W-08 | P0 | Join tables | Party 6: pick two tables in one area that sum ≥ 6 | "2 tables, N seats for 6 pax"; card shows "Tables N + M" | ☐ |
| W-09 | P1 | Table rules | Pick tables summing < party, submit; pick a third table that isn't needed; pick a table in another area | "Chosen tables seat X, party needs Y." (blocked); "Tables already seat X for Y pax. Deselect one to swap." (not added); other area replaces the selection | ☐ |
| W-10 | P0 | **Takeover of a late holder** | Book table N at a time T (status confirmed); after T + grace, open a walk-in at T on table N | Table N is pickable; warning "<guest> booked T and hasn't arrived; taking this table marks <guest> as no-show."; on save the old booking becomes `no_show` (status event reason "table taken over by walk-in", audited) | ☐ |
| W-11 | P0 | Held table blocked | Same before T + grace, or holder `arrived`/`seated` | Table dimmed and not pickable; tooltip shows holder name + time; forcing via API → 409 `table taken` | ☐ |
| W-12 | P1 | Table taken during edit | Another device books the chosen table first, then submit | "table taken"; selection cleared; map refreshed | ☐ |
| W-13 | P2 | Modal reset + Esc | Fill, close (Esc / backdrop / Close), reopen | All fields reset (time 19:00, source Walk-in, no tables) | ☐ |

### 4.2 Change table modal

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| C-01 | P0 | Open | Change table on a card with a table | Modal shows "<guest> · N guests · time"; current table(s) preselected; every table held by anyone else in the window is dimmed (no takeover here) | ☐ |
| C-02 | P0 | Move | Pick a different free table that fits, "Change table" | Saved; card label updates; audit `reservation.updated` | ☐ |
| C-03 | P1 | Join / unjoin | Large party: pick two tables; then back to one bigger table | Both persist; redundant third table refused with the swap message in the UI (API: 422 `too many tables for the party`) | ☐ |
| C-04 | P1 | Save guard | Open and click nothing; deselect all; pick tables that don't cover the party | "Change table" disabled in all three | ☐ |
| C-05 | P1 | Move to another area | Pick a table in a different area | Reservation's area changes too (host card + dashboard); moving into a full area → 409 `full` (capacity is now checked on every area/size/time change) | ☐ |
| C-06 | P1 | Race | Two hosts move two bookings onto the same free table | Second gets "table taken"; its selection clears and states reload | ☐ |
| C-07 | P1 | Booking without a table | Change table on a "No table" card | Nothing preselected; picking a table assigns it | ☐ |
| C-08 | P2 | Reslot keeps tables valid | `PATCH /staff/reservations/:id` with a new `startsAt` / `partySize` / `seatingAreaId` on a booking that holds a table | Allowed only if its tables are still free and big enough; otherwise 409 `table taken` / 422 `tables are too small` / 422 `table is not in that seating area` / 422 `too many tables for the party`. A booking with no tables is only area-capacity checked | ☐ |

---

## 5. Host journey — Guests (`/host` tab + `/guests/:id`)

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| S-01 | P0 | Search finds any guest | Type `me` (guest "Mega Putri" is not in the first 8 alphabetically) | Listed with phone, `N visits`, badges | ✔ |
| S-02 | P1 | Search fields | Name fragment, phone digits, email fragment | All match, case-insensitive (phone now stored as `+62 812-…`: search by a digit run that includes the dash formatting, e.g. `812-345`) | ☐ (phone format changed) |
| S-03 | P1 | Min length | 0–1 chars | "Type at least 2 characters."; no request | ✔ |
| S-04 | P1 | Max 8 results | Query matching >8 guests | 8 rows | ✔ |
| S-05 | P1 | No results | `zzzzz` | "No guests match." | ✔ |
| S-06 | P1 | Fast typing | Type quickly then change query | Debounced; final list matches final query | ✔ |
| S-07 | P0 | Profile renders | Click a result | `/guests/<id>`: contact (+ country), allergies, accessibility, seating preference, internal notes, visits/cancelled/no-show counts, visit history | ✔ |
| S-08 | P1 | Visit feedback | Visit with feedback | "Guest feedback: x/5", comment, "Stood out: …" | ✔ |
| S-09 | P1 | Profile is read-only | Look for edit controls | None | ✔ |
| S-10 | P1 | Back button | host → guest → Back; admin → guest → Back; direct URL → Back | Returns to origin; direct load falls back to `/host` (host) or `/admin` (admin) | ✔ |
| S-11 | P1 | Visit pagination | Guest with >10 visits | 10/page, Previous/Next, "Page x of y" (hidden when 1 page) | ☐ |
| S-12 | P0 | Other venue's guest | `/guests/<id from another venue>` as host | No data (403 / not found) | ✔ |
| S-13 | P1 | Unknown id | `/guests/00000000-0000-0000-0000-000000000000` | "Guest not found." | ✔ |
| S-14 | P1 | Super admin search scope | Super admin selects venue B in the header, searches a guest that exists only in B | B's guest found, A-only guests not; changing the header venue re-runs a typed query (was: searched the first linked venue; fixed 2026-11-12) | ☐ |

---

## 6. Admin journey — Dashboard (`/admin`)

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| D-01 | P0 | Loads | Open as admin | All panels render; no console errors | ✔ |
| D-02 | P1 | Range presets **(changed)** | today / 7 / 30 / custom (From/To use the shared `DatePicker`) | Numbers + labels update; `last7` = today−6…today, `last30` = today−30…today (31 days); no client-side check on custom: a bad range (from > to or > 366 days) returns 400 `invalid date range`, shown inline | ☐ |
| D-03 | P1 | Filters **(changed)** | Status, Source, Occasion (no Area filter) | One request `/api/admin/analytics?from&to&…`. Source/Occasion apply to Guest mix, Channel, Reliability and the table; **Status only narrows the table**. Today live, Next 7/30 days, cues, Guest feedback and Turn time ignore the filters (feedback and turn time follow the range only). The Source list omits `chope_import`; Occasion options narrow to the current selection | ☐ |
| D-04 | P1 | Action cues | Slot over capacity, no-show rate high, repeat guest with allergies | Cue appears when its condition is met; "Open guest →" / "Open host view →" go to the right place | ✔ |
| D-05 | P1 | Today live **(changed)** | Bookings, expected covers, arrived, seated, completed, no-shows/cancellations, fill % | Expected covers matches the host's active covers; **Bookings counts every status** (host header excludes cancelled/no-show); Arrived/Seated are cumulative (arrived includes seated and completed) | ☐ |
| D-06 | P1 | Next 7 / 30 days **(changed)** | covers/day, fill %, busiest slot, peak day | **Booked covers, not a forecast** (pending, confirmed, arrived, seated, completed). 7 days: bars with `(fill%)` and Busiest slot. 30 days: line chart, "N covers · avg X/day · peak N on <day>", see D-16 | ☐ |
| D-07 | P1 | Guest mix, channels, reliability **(changed)** | first-timers vs repeats, occasions, party buckets; channel share %; no-show %, cancel %, avg lead time | No NaN / undefined. Total guests is venue-wide, so first-timers + repeats (visits inside the period) need not equal it; channel shares exclude cancelled and may not sum to 100 | ☐ |
| D-08 | P1 | Guest feedback panel **(changed)** | avg rating, distribution, top tags, latest | Shows feedback **submitted within the selected range** (newest first, max 200 loaded; average/tags computed from those rows; unaffected by Status/Source/Occasion); 10 per page with Previous/Next; click opens detail modal (Esc, Close or backdrop closes; "Open guest profile →") | ☐ |
| D-09 | P1 | Reservations table search | name / code / phone | Filters; "N matching" updates | ✔ |
| D-10 | P1 | Reservations pagination | >10 matches | 10/page; shrinking results clamps the page | ✔ |
| D-11 | P1 | Export CSV button **(changed, was ✘)** | Click Export CSV in the table header; also with 0 matches | Downloads `gioi-reservations-<from>_<to>.csv` with exactly the rows shown (filters + search): booking_code, guest_name, phone, email, party_size, date, time, area, source, status, allergies, accessibility; formula cells prefixed `'`; disabled with 0 matches | ☐ |
| D-12 | P2 | Empty range | Range with no data | Empty states, no NaN | ✔ |
| D-13 | P1 | New venue, no data | Dashboard on a venue with zero reservations | Zeros/empty states; no NaN, no "Invalid Date", no 500 | ✔ (found + fixed: "peak 0 on Invalid Date") |
| D-14 | P1 | API down on dashboard | Stop the API, reload `/admin` | The real error message shows (not "Invalid date range"); no crash | ☐ |
| D-15 | P1 | Turn time card | Dashboard with completed bookings; then a range with none | Per area: average minutes from Seated → Completed events in range, seatings count, target = venue `diningMinutes` (no Settings input yet); areas with no seatings are hidden; none at all → "No completed seatings in this range." | ☐ |
| D-16 | P2 | 30-day chart hover | Hover the chart; leave; move to the edges; reduced-motion on | Guide line, dot and tooltip (day, "N covers", "B bookings · P% full") follow the pointer and stay inside the card; axis shows day numbers with "d Mon" at the start and on the 1st; line draws in on load (instant under reduced motion) | ☐ |

## 7. Admin journey — Settings (`/admin/settings`, every save audited)

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| T-01 | P0 | Load **(changed)** | Open as venue admin and super admin | Venue admin: Restaurant, Opening hours & rules, Guest feedback, Data export. Super admin: New venue, Floor plan drawing, Accounts (for the venue chosen in the header) | ☐ |
| T-02 | P0 | **Restaurant** | Edit tagline/intro/address/maps URL/phone/WhatsApp/policy → Save restaurant | "Saved at …"; persists; shown on `/bali`; audit `settings.updated` with only changed fields | ✔ |
| T-03 | P1 | Name read-only | Restaurant name | Disabled (not in the API whitelist) | ✔ |
| T-04 | P1 | **Opening hours & rules** **(changed)** | Hours per weekday (12-hour TimePicker), booking interval, party min/max, lead time, cut-off, table hold grace, no-show target, over-capacity alert %, closed dates (shared `DatePicker`; add with "+ Add", Enter no longer adds) → Save hours & rules | Public availability follows each; grace drives W-10. There is no `diningMinutes` field (it is in the API whitelist; Turn time shows it as the target) | ☐ |
| T-05 | P1 | **Guest feedback** **(changed)** | Title, subtitle, WhatsApp template (tags field is read-only) → Save | Template used by the host's feedback link; title/subtitle (and venue name) shown on `/bali/feedback/<code>`, falling back to the defaults when empty | ☐ |
| T-06 | P1 | **Seating areas** | Moved to the floor plan editor (F-13 to F-22) | Settings has no Seating areas card | ✔ |
| T-07 | P1 | **Accounts** (super admin) | See 7.1 (T-13…T-28) | Replaced by the Venues/Accounts scenarios | ✔ |
| T-08 | P0 | **Data export** | Download reservations CSV | File downloads with guest contact + allergy/accessibility notes; 403 for hosts | ✔ |
| T-09 | P1 | Save is diffed | Change one field, save | Audit event lists only the changed field(s) | ✔ |
| T-10 | P1 | Failed save | Stop the API, Save | "Save failed…" message, no silent success | ☐ |
| T-11 | P1 | Concurrent edit | Two tabs edit the same card | Last save wins; no crash; no stale data after reload | ☐ |
| T-12 | P2 | Validation | Negative numbers, min > max party, bad time ranges | Rejected with a clear message ("… must be a non-negative integer", "party size limits are invalid") | ✔ |
| T-29 | P1 | Grace validation | Grace = -1, 121, 7.5 via the field or API | 422 "graceMinutes must be an integer between 0 and 120"; 0 and 120 accepted | ☐ |
| T-30 | P1 | Maps URL validation | Maps URL `javascript:alert(1)`, `ftp://x`, empty, `https://maps.app.goo.gl/…` | 422 "mapsUrl must be an http(s) URL" for the first two; empty and https accepted | ☐ |
| T-31 | P1 | Special notice settings | Enable notice → date + text appear; save; disable | Persisted; enabling with no date → 422 "noticeDate is required when the notice is enabled"; bad date → 422; booking page follows (G-55…G-57) | ☐ |

### 7.1 Super admin: venues and accounts (Settings + header venue select)

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| T-13 | P0 | Create venue **(changed)** | Settings → New venue → name + slug → Create venue | Page reloads; new venue is selected in the header; audit `venue.created`; blank details for its admin to fill | ☐ |
| T-14 | P1 | Slug rules | Uppercase, spaces, duplicate slug | Rejected (form pattern / 400 / 409 "venue slug already exists"); nothing created | ✔ |
| T-15 | P1 | Switch venue **(changed)** | Change the header venue select | Accounts list and drawing reload for that venue only; choice survives reload | ☐ |
| T-16 | P0 | Add account | Accounts → name, login, password (12+), role → Add account | Listed; user can log in; lands on `/admin` (admin) or `/host` (host); sees only that venue | ☐ (admin ✔ lands `/admin`; host login ✔ via API; host landing page and venue isolation not run) |
| T-17 | P1 | Login rules | Duplicate login; login typed with capitals/spaces | 409 "login already exists"; stored trimmed + lowercase; login form accepts any case | ✔ |
| T-18 | P1 | Password length | Password under 12 chars | Blocked in the form; API 400 | ✔ |
| T-19 | P1 | Edit account | Change name, login, role → Save accounts | Persists; role effective on next login; audit `user.updated` | ☐ (name + login ✔; role change and audit entry not checked) |
| T-20 | P0 | Reset password | Type a new password → Save accounts | New password works, old fails; that user's open sessions get 401; blank field keeps the old password | ✔ |
| T-21 | P1 | Deactivate | Untick Active → Save | User signed out on next request; cannot log in | ✔ |
| T-22 | P0 | Remove | Remove → confirm; also test Cancel on the prompt | Cancel changes nothing; confirm removes from the list; user with no other venue cannot log in; audit `user.removed` | ✔ (audit entry not checked in the UI) |
| T-23 | P1 | Super admin hidden | Look at the Accounts list | The super admin's own row is not listed | ✔ |
| T-24 | P1 | Empty states **(changed)** | No venues; venue with no accounts | No header select; Settings shows only New venue; "No admin or host accounts for this venue yet." | ☐ (no-accounts half ✔; zero-venue state not run) |
| T-25 | P0 | API authorization | As host / venue admin / logged out: `GET`/`POST /api/admin/venues`, `POST`/`PUT /api/admin/users`, `DELETE /api/admin/users/:id?venueId=` | 403 / 403 / 401; `DELETE` on a super admin id → 404; bad UUID → 400 | ✔ |
| T-26 | P0 | Venue admin first run | Log in as the new venue admin on a blank venue | Settings loads; fill Restaurant, hours; Floor plan: add areas + tables; `/<slug>` shows them (needs a `VENUE_SEO` entry for the landing page, see Known gaps); multi-venue isolation holds (R-09) | ✔ (Restaurant only; hours/seating not filled) |
| T-27 | P1 | No spaces in logins | Create or edit a login containing a space, or only spaces | 422 "login must not contain spaces"; leading/trailing spaces are trimmed | ✔ |
| T-28 | P1 | Rename to an existing login | Edit an account's login to another user's login → Save | 409 "login already exists"; renaming to its own login is a no-op | ✔ |

### 7.2 Super admin venue selector (header)

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| V-01 | P0 | Select shows all venues **(changed)** | Log in as `admin` | Header select lists every venue by name; "(slug)" is appended only when two venues share a name; first venue selected when nothing stored | ☐ |
| V-02 | P0 | Host follows the venue | On `/host`, switch venue | Day view reloads for that venue (`/staff/day?date&venueId`); walk-in, change table, day export use that venue | ☐ |
| V-03 | P0 | Dashboard follows the venue | On `/admin`, switch venue | Analytics refetches with `venueId`; numbers match that venue | ☐ |
| V-04 | P1 | Persistence | Switch, reload, sign out and in | Same venue (stored as `gioi.venueId`); a stored id for a deleted venue falls back to the first venue | ☐ |
| V-05 | P1 | Not shown to others | Log in as `venueadmin`, `host` | No venue select | ☐ |
| V-06 | P1 | Storage blocked | Private window with storage blocked | Page still works; selection just isn't remembered | ☐ |
| V-07 | P1 | Guest search / audit scope | Switch to venue B, then Host → Guest search and `/admin/audit` | See S-14; Audit shows only the selected venue's events and reloads on switch (`?venueId=` in the URL still wins) | ☐ |
| V-08 | P2 | Mobile header | 390 px as super admin | Select, Sign out and logo fit without overflow | ☐ |

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
| F-09 | P1 | Layout validation | Save a table with an unknown area id; one at x = 99999; a table `id` that doesn't exist | 422 "unknown seating area"; 422 "item is outside the floor plan"; 422 "unknown table" | ☐ (unknown table id new) |
| F-10 | P1 | Public plan is safe | `GET /api/public/venues/bali/floor-plan` | Only width, height, image, areas, tables, objects; tables carry id, seatingAreaId, seats, x, y, rotation; no guest or booking data | ✔ |
| F-11 | P2 | Editor controls | Drag, arrow nudge (Shift ×10), `R` rotate, `+`/`−` chair, Delete key / button | Each updates the plan; clamped inside the plan | ✔ |
| F-12 | P2 | New drawing keeps positions | Replace the drawing with a different aspect ratio | Tables keep their positions; any outside the new box are clamped when the editor loads | ☐ |
| F-13 | P0 | Create an area | Floor plan → + Add area → name "Rooftop" → **+ Add table** in the panel → + chair → Save layout | Area listed with 1 table and 5 seats; DB row has capacity 5, no party limits, bookable; survives reload | ✔ |
| F-14 | P0 | Delete an area with reservations | Pin an area that has a booking (Sunset Terrace) → Delete area → Save layout | Save fails with "Sunset Terrace has reservations and cannot be deleted"; Revert brings it back; nothing changed in the DB | ✔ |
| F-15 | P1 | Delete an empty area | Pin Rooftop (no bookings) → Delete area → Save layout | Area and its tables gone after save and reload | ✔ |
| F-16 | P1 | No tables means no capacity | Save with an area that has no tables (Terrace) | Area stays in the list with 0 seats; its capacity is 0 so it takes no bookings; save succeeds | ✔ |
| F-17 | P1 | Settings has no seating card | Settings as venue admin; `GET`/`PUT /api/admin/venues/:id/seating-areas` | No "Seating areas" card; both routes return 404 | ✔ |
| F-18 | P1 | Area name and party rules | Duplicate names (case-insensitive), empty name, min > max (via API) | 422 "area names must be unique" / "area name is required" / "minParty must not exceed maxParty" | ✔ |
| F-19 | P0 | Area drives where tables go | Select Terrace in the area list | Toolbar reads `+ Table in Terrace`; with no area selected the button is disabled with a tooltip; clicking a table on the plan selects its area | ✔ |
| F-20 | P1 | Selected-item bar **(changed copy)** | Click nothing, a table, then an object | Empty: hint. Table: "Selected table **N** in <area>", Chairs − N +, Rotate, Delete, no Area dropdown. Object: label, W, H, Rotate, Delete | ☐ |
| F-21 | P1 | Area list reads clearly | Look at the area list | Heading "Areas"; each row "N table(s) · M seats"; only the selected row is strongly highlighted; Delete area is red | ✔ |
| F-22 | P0 | No party limits in the UI | Select an area, save a layout, then check `seating_areas` | No Min/Max party inputs; after save `min_party` and `max_party` are NULL for every area | ✔ |
| F-23 | P0 | Table ids are stable | Book table 3; move it on the plan and save; delete table 5 (no bookings) and save | The booking still holds the same table (host label unchanged except for numbering); deleting a table that a booking holds makes that booking "No table" | ☐ |
| F-24 | P1 | Table numbering | Compare numbers on the editor, booking map, walk-in map and host card | Same number everywhere (position in the plan's table order); numbers shift when an earlier table is deleted | ☐ |

## 8. Audit log (`/admin/audit`, super admin)

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| L-01 | P1 | Events recorded **(changed)** | Status change, settings save, users save, floor plan save, drawing upload, venue created, user created, user removed, walk-in takeover (no-show), guest feedback | One event each with actor, entity, time. Only some have friendly text; the rest show the raw action (`floor_plan.updated`, `venue.created`, `user.created`, `user.removed`, `settings.updated`, `feedback.submitted`). `user.updated` is one event per save with no per-field changes. `feedback_link.sent` is not produced | ☐ |
| L-02 | P1 | Newest first | Inspect order | Newest at top | ✔ |
| L-03 | P1 | Filter **(changed)** | Entity dropdown: reservations / status changes / settings / seating areas / feedback links | List narrows; page clamps. There is no venue or user type: `venue.*` / `user.*` events appear only under "All events". Floor plan saves are under "Seating areas"; drawing upload/remove under "settings"; "Feedback links" = guest `feedback.submitted` | ✔ |
| L-04 | P1 | Pagination | >25 events | 25/page, Previous/Next (API returns the latest 100) | ✔ |
| L-05 | P1 | Empty state | Fresh DB | Friendly message | ☐ |
| L-06 | P0 | Access | Host / venue admin | Redirect + API 403 | ✔ |

---

## 9. UI / cross-cutting

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| U-01 | P1 | Staff theme toggle | host/admin pages | Smooth cross-fade incl. header; persisted; staff default dark when unset | ✔ |
| U-02 | P1 | Responsive | 390 / 768 / 1280 on every page (incl. walk-in and change-table modals with the map) | No unintended horizontal overflow; mobile nav is a second row; modals scroll within the viewport; tap targets ≥ 44 px | ☐ |
| U-03 | P1 | Keyboard | Tab through login, booking, host list, modals, phone/country comboboxes, time picker | Visible focus, logical order, Esc closes modals and listboxes | ☐ |
| U-04 | P2 | Reduced motion | OS setting on | Theme switch, map fade-in/ring/badge, GSAP hero all instant | ☐ |
| U-05 | P1 | Console clean | Walk every page | No uncaught errors/hydration warnings | ✘ |
| U-06 | P1 | API down | Kill API mid-session | Error states, not a blank page or endless "Loading…" | ☐ |
| U-07 | P1 | Host-based routing **(changed)** | `book.*`: `/login`, `/host`, `/admin`, `/guests/x` · site host: `/bali/book`, `/bali/confirmation/x`, `/bali/feedback/x` · localhost / `*.vercel.app`: everything | 404 · 301 to `book.*` (same path) · all routes served (see `server/middleware/host-routes.ts`) | ☐ |
| U-08 | P2 | Time zone | Booking near midnight (Asia/Makassar) | Same date/time on confirmation, host, admin, `.ics` | ✔ |

## 10. Security smoke (browser DevTools / curl)

| ID | P | Check | Expected | Status |
|---|---|---|---|---|
| X-01 | P0 | Every `/api/staff/*` and `/api/admin/*` call with no cookie | 401 | ✔ |
| X-02 | P0 | Replay an old cookie after logging in elsewhere | 401 | ✔ |
| X-03 | P0 | Public booking lookup response | No phone/email/internal notes | ✔ |
| X-04 | P1 | XSS: guest name/notes `<img src=x onerror=alert(1)>` | Rendered as text on host, profile, admin, audit, walk-in tooltip, WhatsApp text | ✔ (tooltip/WhatsApp not re-run) |
| X-05 | P1 | SQL-ish search `' OR 1=1 --` | Treated literally | ✔ |
| X-06 | P1 | Tamper UUIDs (reservation/guest/venue/table from another venue) | 403/404/422 only | ✔ (table ids not run) |
| X-07 | P1 | Garbage or oversized bodies to public booking | 4xx, never 500 | ✔ |
| X-08 | P1 | Error shape / headers | `{ error, message }`; no stack traces | ✔ |
| X-09 | P0 | CSV formula injection | Book with name `=HYPERLINK("http://x","y")`, `+1`, `-1`, `@x`; export from Settings, Dashboard and Host | Cells starting with `= + - @`, tab or CR start with `'` (neutralized); the stored phone `+62 …` is therefore also `'`-prefixed in every export; commas/quotes/newlines quoted | ☐ |
| X-10 | P1 | Public table availability leaks nothing | `GET /api/public/venues/bali/table-availability?date&time&partySize` | Only `unavailableTableIds`; no names/codes. Staff version (`/api/admin/venues/:id/table-availability`) needs a session and venue access | ☐ |
| X-11 | P1 | Prod security headers | `curl -I https://gioigroup.com/bali` | HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, Referrer-Policy, Permissions-Policy, COOP, CSP (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'self'`); site still works under CSP (PostHog via `/ingest`) | ☐ |
| X-12 | P2 | Dev server binding | Start web dev without `NUXT_DEV_HOST` | Listens on `127.0.0.1` only | ☐ |

## 11. Bootstrap, production and CI

| ID | P | Scenario | Steps | Expected | Status |
|---|---|---|---|---|---|
| B-01 | P0 | Venue-only bootstrap | `DATABASE_URL=… ADMIN_LOGIN=admin npx tsx prisma/create-super-admin.ts` (no `ADMIN_PASSWORD`) on a DB with an admin and no venue | Prints `super admin ready: admin, venue: bali`; admin password unchanged; `GET /api/public/venues/bali` 200; safe to run twice | ✔ (local DB) |
| B-02 | P1 | Bootstrap guards | Unknown `ADMIN_LOGIN` without password; `ADMIN_PASSWORD` shorter than 12 | Both stop with a clear error. Password-length check writes nothing; the unknown-login case runs the venue upsert first, so a missing venue can still be created | ☐ |
| B-03 | P0 | No venue yet (prod symptom) | Log in as super admin on a DB with no venue | Host waits for a venue (empty day); Dashboard shows empty data or a real error; Settings shows New venue, not a blank page | ☐ |
| B-04 | P1 | Re-login after bootstrap | Run the script while logged in, reload | Venue appears in the header select (list loads once per page load) | ☐ |
| B-05 | P1 | Empty-venue public page | Open `/<slug>` for a venue with blank address/phone/hours | Page renders without crash if the slug has a `VENUE_SEO` entry; otherwise 404 | ☐ (rule changed) |
| B-06 | P1 | CI | Push to a PR | Postgres 17 service; setup pnpm, install, prisma generate, `nuxt prepare`, typecheck, `pnpm test` (excludes `__tests__/db`, so DB tests do not run in CI), prisma validate | ☐ (steps ✔ locally; GitHub run pending) |
| B-07 | P0 | Prod migrations | Deploy | `0004_reservation_table`, `0005_venue_grace_minutes`, `0007_venue_notice`, `0008_reservation_tables` applied by the owner role; existing bookings keep working with "No table" | ☐ |

---

## Known gaps worth a ticket (not scenarios)

> **Fixed and committed in `eb5bb08` (re-run the rows):** marketing consent saved (G-58), staff capacity checks on edit + walk-in (C-05, W-04), walk-in confirmed in one call (W-01), notice only on its date + date required (G-55, T-31), feedback page uses Settings (T-05), duplicate CTA/footer removed (G-30), dashboard export = shown rows (D-11), super admin guest search + audit follow the header venue (S-14, V-07). `35f29c2` reworked `/admin/analytics` (no `guests` array, guest fields on rows, range-scoped feedback, Turn time). Migration `0008_reservation_tables` must be applied by `gioi_owner`, not `gioi_app`.
>
> **DB tests (`gioi_test`) on 2026-11-12:** 18/18 pass, incl. the new capacity/walk-in/notice test. Two stale tests were fixed: public bookings now send `tableId` (not `tableIds`), and the takeover test opens the venue 00:00–24:00 for its run so it no longer fails before 10:00 / after 22:00.

- Guest cancel exists only as an API; no button on the confirmation page (per customer diagram).
- `feedback_link.sent` is never audited by `apps/` (the host's WhatsApp feedback/reminder buttons are client-only).
- Expired notices are switched off only when a venue admin opens Settings (harmless: the notice applies only on its own date).
- Landing pages come from `VENUE_SEO` in code: a venue created in Settings has no `/<slug>` page until a code change.
- CSP still allows `challenges.cloudflare.com` although Turnstile was removed.
- Migration numbering skips `0006`.
- Login rate limiting is in-memory per serverless instance; needs a shared store for real brute-force protection.
- Sessions have a fixed 7-day life (no sliding expiry).
- Pagination is client-side; only the audit endpoint accepts `limit`.
- Settings hides venue sections from the super admin in the UI only; the API still lets a super admin edit venue settings.
- No hard delete of users: "Remove" unlinks from the venue and deactivates when no venue is left (audit rows reference users).
- No venue rename/delete, and no email field in Settings (email is only set at bootstrap/seed).
- Public staff-login link was removed from the landing footer; `/login` is reachable by URL only.
- Host reminder text always says "today", even for another date; walk-in "not before now" uses the browser clock, not the venue zone.
- Settings has no `diningMinutes` input although Turn time uses it as the target.
- Dashboard Source filter omits `chope_import`; `cancellation_rate_high` cue is declared but never produced.
- `/privacy` is `noindex` but listed in `sitemap.xml`; `book.*/privacy` is not redirected (`vercel.json` exclusion list).
- Auto-picked area for a public booking ignores table availability, so it can land on "No table".
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
