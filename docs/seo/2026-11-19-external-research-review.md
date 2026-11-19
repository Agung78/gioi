# Review of external /bali SEO research (2026-11-19)

Checked against: `apps/web/utils/venueSeo.ts`, `composables/useVenueSeo.ts`, `vercel.json`, live `curl` on gioigroup.com (2026-11-19), and the 2026-11-13 docs in this folder.

## Claims already false / already done

| Claim | Reality |
|---|---|
| `www.gioigroup.com/brands/gioi-ocean-gourment` exists and competes with `/bali` | Live: www → apex (308) → `/brands/gioi-ocean-gourment` → `/bali` (301). `gourmet` spelling and trailing slash too. Only Google's index is stale; request recrawl in GSC |
| Enforce www → apex | Already live (308 from Vercel) |
| Canonical must strip UTM | Live `/bali?utm_source=x` canonical = `https://gioigroup.com/bali` |
| Hero image / LCP / `@nuxt/image` | Hero already preloaded with `fetchpriority=high`, webp + srcset. `@nuxt/image` is not a dependency; don't add it |
| "Nitro SSG, `pages/bali.vue`, `useBaliSchema.ts`" | Route is `pages/[venue]`; schema lives in data-driven `useVenueSeo`. A bali-only composable would fork it |
| Missing BreadcrumbList | Already emitted (3 JSON-LD blocks: Restaurant, BreadcrumbList, FAQPage) |
| Missing Discovery Mall entity | `containedInPlace` ShoppingCenter already present |
| Hours/phone | Live JSON-LD: 10:00–22:00 Mon–Thu, 22:30 Fri–Sun, `+6281139606101`. Matches research |

## Valid and worth doing

1. **HTML menu on `/bali`** (research bottleneck 2). Confirmed: menus are only PDFs (`/menus/bali-menu.pdf`); only 4 signature dishes are HTML. Cheapest form: extend `VENUE_SEO.bali` with menu sections, render in the page, emit `Menu`/`MenuSection`/`MenuItem` in the same composable. Items in JSON-LD must be visible. Render all tabs in the DOM (CSS toggle, not `v-if`). Needs the real menu text and prices from the owner; research's Eggs Benedict / Smoothie Bowl IDR 75k and descriptions are not sourced.
2. **Menu PDFs cache** (new finding). `/menus/*` is served `max-age=31536000, immutable`. A price change in a PDF will not reach returning visitors unless the filename changes. Version the filename or drop `immutable` for PDFs.
3. **H1 lockup**: live H1 is `aria-label` slogan with `aria-hidden` word spans; the keyword badge sits outside the H1. Moving the badge text into the H1 is low-risk. Optional; Google already infers location from title/badge/intro, and brand queries rank 1–3.
4. **Indonesian `/id/bali`**: valid (Discovery Mall queries are Indonesian), but explicitly deferred 2026-11-13. Keep deferred until the 4-week GSC pull shows non-brand Indonesian demand.
5. **Third-party NAP audit** (Grab 11 PM, BCA phone `082226961011`): plausible, not verified by me; fold into the existing Chope/price-consistency manual task.
6. Research's `aggregateRating` advice is correct and matches current code (ratings shown as text only).

## Wrong, risky, or unverified: do NOT copy

| Item | Problem |
|---|---|
| Title `…Beachfront Seafood & Sunset Dining Kuta` (66 chars) | Labelled "fits desktop"; it will truncate (the old 73-char title did). Current 53 chars is safe and brand queries are already top 3. If changing, keep ≤ 60 |
| `priceRange: IDR 150,000 - 455,000` | Contradicts the decided IDR 250–300k (site and Maps) |
| Placeholders `your-booking-engine-url.com`, Tripadvisor `...`, fake image URLs | Real booking URL is `https://book.gioigroup.com/bali/book`; TripAdvisor URL already in `sameAs` |
| `smokingAllowed`, `wheelchairAccessible`, Free Wi-Fi, QRIS/BCA, 224+ guests, weekend fire dance/live music, sunset 5:45–6:30, "reserve by 5 PM", Waterbom proximity, `hello@gioigroup.com` | No source in repo or site. Ask owner before publishing any; wrong claims in schema/FAQ are worse than missing ones |
| Sunset-time and romantic-dinner content | Owner dropped these on 2026-11-13 |
| Targeting `gioi bali halal` | Owner decision: do not target halal. A plain dietary note is already in the FAQ (pork and alcohol served) |
| Merge into one `@graph` | Separate blocks with `@id` are valid; no ranking gain. Only link FAQ/Breadcrumb via `@id` if touching the file anyway |
| `identifier` PropertyValue for Place ID/CID | Not a Google-recognised signal; `sameAs` already has the CID |
| "FAQ rich results discontinued May 7 2026" | Could not verify. Either way keep visible FAQ + FAQPage |
| GSC thresholds (>300 impressions / 90 days, positions 8–20) | Property has only 3 days of data (1,921 impressions; `/bali` 149). Rerun the pull at ~4 weeks and lower thresholds |
| "Homepage competes with `/bali`" | Homepage impressions are Jakarta (Senopati) queries; title is `GIOI Group | Restaurants in Indonesia`. Not cannibalizing Bali. Do NOT blanket redirect `/brands/*` (Jakarta pages still get ~450 impressions) |

## Suggested order

1. Deploy pending changes; GSC recrawl of `/bali` and the old brand URL (existing doc).
2. Fix PDF cache headers.
3. Get menu text + prices from the owner, ship HTML menu + `Menu` schema.
4. Optionally fold badge into H1.
5. Re-pull GSC at 4 weeks; decide `/id/bali` and title/meta changes from data.
