# Floor plan & seating

Production port of the prototype `docs/gioi_bali_2d_floor_plan.html`: a per-venue 2D floor plan whose tables drive seating-area capacity, plus a read-only map on the guest booking page.

Booking stays **area-level** (design doc §4, "start with seating-area capacity"). Tables do not get reservations; they define how many covers each area holds.

## Roles

| Action | Venue host | Venue admin | Super admin |
|---|---|---|---|
| View floor plan (admin) | – | yes | yes (preview) |
| Move / add / remove tables, chairs, objects | – | **yes** | **no** (unless also admin of that venue) |
| Upload / remove the backdrop drawing | – | – | **yes** |
| See read-only map while booking (guest) | public | public | public |

"Venue admin" means `user_venues.role = 'admin'` for that venue. The layout save checks `userRole(session, venueId) === 'admin'` and does **not** let super admin through by global rights. That is the one place this feature departs from `requireAdmin`.

## Data model (migration `0002_floor_plan`)

```mermaid
erDiagram
  venues ||--o| floor_plans : "backdrop"
  venues ||--o{ floor_tables : ""
  venues ||--o{ floor_objects : ""
  seating_areas ||--o{ floor_tables : "seats sum into capacity"
```

| Table | Columns | Rules |
|---|---|---|
| `floor_plans` | `venue_id` PK, `image` text NULL (data URL), `width` smallint (always 1200), `height` smallint, `updated_at` | image is NULL or `data:image/(svg+xml\|png\|jpeg\|webp);base64,…`, ≤ 4,000,000 chars; size 100–4000 |
| `floor_tables` | `id`, `venue_id`, `seating_area_id`, `seats`, `x`, `y`, `rotation` | FK `(seating_area_id, venue_id)` → `seating_areas(id, venue_id)`, so a table can't point at another venue's area; seats 1–16; rotation 0–359 |
| `floor_objects` | `id`, `venue_id`, `label`, `width`, `height`, `color`, `x`, `y`, `rotation` | size 20–600; label ≤ 24; color `#RRGGBB` |

### Plan space

- Units: the plan is `width × height` units. Width is fixed at **1200**. Height follows the uploaded drawing's aspect ratio (`round(1200 × h / w)`), and is 900 when there is no drawing.
- Table and object `x`/`y` is the **centre**; `rotation` is degrees clockwise.
- A table at 0° is horizontal, with chairs split over its two long sides. Icons are drawn at `TABLE_SCALE` (0.95), the same as the prototype.
- Changing the drawing keeps the stored positions. The editor clamps any item that ends up outside the new box when it loads.

## Capacity rule

```mermaid
flowchart LR
  E[Venue admin saves layout] --> T[(floor_tables)]
  T -->|SUM seats per area| C[seating_areas.capacity]
  C --> B[Booking engine: public + walk-in, unchanged]
```

- When the layout is saved, in the **same transaction**, every area that has tables gets `capacity = SUM(seats)`. That row update takes the same row lock that booking transactions take (`SELECT … FOR UPDATE`).
- Areas with **no tables** keep their manually set capacity.
- The seating-areas settings save ignores a submitted capacity for any area that has tables. `GET /admin/venues/:id/seating-areas` returns `planSeats` (`null` when the area has no tables), and the settings UI makes the capacity box read-only when that is set.
- Lowering capacity never cancels existing bookings. It only blocks new ones, just like editing capacity by hand.
- Audit: `floor_plan.updated` (with table and object counts plus per-area capacity changes), `floor_plan.image_uploaded`, and `floor_plan.image_removed`.

## API

| Method & path | Who | Body / query | Returns |
|---|---|---|---|
| `GET /admin/venues/:id/floor-plan` | venue admin, super admin | – | `AdminFloorPlan` |
| `PUT /admin/venues/:id/floor-plan/layout` | **venue admin only** | `{ tables: FloorTable[], objects: FloorObject[] }` (≤ 500 tables, ≤ 200 objects) | `AdminFloorPlan` |
| `PUT /admin/venues/:id/floor-plan/image` | **super admin only** | `{ image: string \| null, width?, height? }` (natural size of the drawing; required when `image` is set). Body limit 4.5 MB | `AdminFloorPlan` |
| `GET /public/venues/:slug/floor-plan` | public | – | `PublicFloorPlan` |
| `GET /public/venues/:slug/availability` | public | `date`, `party`, **`area` (optional uuid)** | slots for that area only, or across all areas when omitted |

The shared types live in `packages/domain/src/types.ts`: `FloorTable`, `FloorObject`, `FloorPlanArea`, `PublicFloorPlan`, `AdminFloorPlan`.

Errors: 403 `venue admin required` / `super admin required`; 422 `unknown seating area`, `item is outside the floor plan`, `drawing must be an SVG, PNG, JPEG or WebP under 3 MB`.

Uploaded SVGs are only ever rendered through SVG `<image href>`, which doesn't run scripts. They are never served or inlined as a document.

## Admin UX

- **`/admin/floor-plan`** (venue admins; nav link "Floor plan"): the prototype editor, saved to the DB.
  - Drag, arrow-key nudge (Shift = 10 units), R / buttons to rotate (±15°, Shift ±90°), +/− chairs (1–16), Delete key.
  - Add a table (it goes into the area picked in the toolbar) or an object (presets Stage, Bar, DJ booth, Entrance, Planter, Custom; label, W and H are editable).
  - Each table has a seating-area dropdown.
  - Side panel lists each area with its table count and seats; hover or click highlights that area. Total seats.
  - Explicit **Save layout** with an unsaved-changes indicator and **Revert** to reload.
  - Users without venue admin rights see the plan read-only.
- **`/admin/settings`** for super admins: "Floor plan drawing" upload, preview and remove for the selected venue.
- **`/admin/settings`** for venue admins: the capacity box is read-only and shows "from floor plan" when `planSeats` is set.

## Guest booking UX (`/[venue]/book`)

- The Seating **pills stay the main control**. The map only explains them.
- A read-only map sits under the pills, shown only when there is more than one bookable area **and** the plan has tables.
  - Selecting a pill fades the other areas' tables (opacity 0.22; no transition under reduced motion). "Anywhere" shows everything.
  - Tapping a table selects its area when that area is bookable and fits the party.
  - The map sits on a fixed light paper background, so uploaded drawings read correctly in dark mode.
- Pills for areas that can't fit the party are disabled and show the reason ("Up to 4 guests", "Parties of 2+"). If the party changes and the selected area no longer fits, the selection goes back to Anywhere.
- Time slots are fetched for the selected area (`area` query), so the grid matches what the server will accept.
- **Anywhere** sends no `seatingAreaId`, so the server picks the area (`pickAreaForParty`).

## Booking fixes shipped with this feature

| Was | Now |
|---|---|
| "Anywhere" sent the smallest-capacity area, chosen in the browser from an empty reservation list, so bookings piled into Chef's Counter and got false "full" errors | `seatingAreaId` is sent only when the guest picked an area |
| Slots ignored the picked area | `area` query param; domain `getDayAvailability(…, { seatingAreaId })` |
| Confirm button disabled with no reason when the area's party rules failed | Pills that don't fit are disabled and show the reason |
| The server didn't check an explicitly picked area's `minParty`/`maxParty` | Checked in the booking transaction (422) |
| Availability loaded every reservation the venue ever had | Query filtered to the requested day |
| Settings "Add seating area" created `area-xxxx` ids, which the uuid schema rejected | New rows are sent without an id |

## Operations

```sh
cd apps/api
pnpm prisma:migrate    # applies 0002_floor_plan
pnpm prisma:generate   # regenerates src/generated/prisma
pnpm prisma:seed       # stores the Bali drawing (prisma/floor-plans/bali.svg) only if Bali has none yet
```

The seed does not create tables: production seating areas (Main Hall, Sunset Terrace, …) don't match the prototype's zones. The Bali venue admin lays out the tables once in `/admin/floor-plan`. Until then the guest map stays hidden.

## Known limits (ponytail)

- A layout save replaces all rows, so table ids change on every save. Switch to per-id upsert once reservations reference tables.
- Icon size is fixed in plan units. A drawing at a very different scale makes tables look too big or too small. Add a per-venue table scale only once a second real drawing needs it.
- Removing a seating area in settings still doesn't delete it on the server (a bug that predates this feature).
- No table-level assignment or host floor view. Both are deliberately out of scope until GIOI's floor rules ask for them.
