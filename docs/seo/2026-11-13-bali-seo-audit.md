# /bali SEO audit and handoff (2026-11-13)

Scope: `gioigroup.com/bali` (GIOI Ocean Gourmet, Kuta). The group homepage and other venues are not built yet and are out of scope for now.

Inputs: GSC "Performance on Search" export (last 24h only: 564 impressions, 9 clicks), SEOmator crawl (score 94/A), live curl checks, Google autocomplete (gl=id), web search.

## Status

### Done in code (uncommitted, not deployed)

| Change | Files | Verified |
|---|---|---|
| Unknown URLs returned **500** to browsers/Googlebot (404 only for curl). Cause: Pinia 2.3.1 `shouldHydrate` calls `obj.hasOwnProperty` on a null-prototype payload object while rendering `error.vue`. Fix: `pinia@^3.0.4`, `@pinia/nuxt@^0.11.3` | `apps/web/package.json`, `pnpm-lock.yaml` | Local prod build: `/zzz`, `/exclusive-offers` → 404 "Page not found"; `/bali` → 200 |
| Title shortened to `GIOI Ocean Gourmet Bali \| Beachfront Seafood in Kuta` (was 73 chars, truncated; Google already rewrote it to this) | `apps/web/utils/venueSeo.ts` | Rendered in local build |
| `sameAs` + Google Maps CID `https://maps.google.com/?cid=3840486500794243861` and TripAdvisor | `apps/web/utils/venueSeo.ts` | JSON-LD in local build |
| `/privacy` (noindex) removed from sitemap | `apps/web/server/routes/sitemap.xml.ts` | Local `/sitemap.xml` |
| "Share your visit on Google" button on feedback thank-you screen, shown to **every** guest (no rating gating: Google policy). `reviewUrl` field, Place ID `ChIJraC4OABH0i0RFRuG7B8mTDU` (verified resolves to the listing) | `apps/web/utils/venueSeo.ts`, `apps/web/pages/[venue]/feedback/[code].vue` | Typecheck clean (except 4 pre-existing `pos` errors in `venueSeo.ts`). Thank-you screen not viewed: needs a completed reservation |

After deploy:
- GSC → URL Inspection → `/bali` → Request indexing.
- Inspect `/exclusive-offers` in GSC: must be 404, not 500.
- On staging, complete one reservation, submit feedback, confirm the Google button opens the review dialog.

### Checked and fine
- Mobile: 390px viewport, `scrollWidth` 390 (SEOmator "horizontal scroll" is a false positive).
- Warm cache: LCP 212ms, TTFB 41ms (SEOmator 4.47s LCP was a cold miss).
- One H1, hero image preloaded with `fetchpriority=high`, all images have alt, Restaurant schema (hours, geo, menus, ReserveAction) + FAQPage.
- Signature dishes with prices already in HTML; full menus are PDFs (enough for now).

## Open decisions

### 1. Legacy `/brands/*` redirect (`apps/web/vercel.json`)
All `/brands/*` 301 to `/bali`, including Jakarta/PIK venues (Penn, The Brassey, Sinar Mandala, Shabu Baru, GIOI Cafe). Someone clicking an old "penn jakarta" result lands on a Bali seafood page; Google treats it as a soft 404 and it adds nothing to `/bali`.

Proposal: only `/brands/gioi-ocean-gourment` → `/bali` (301); other `/brands/*` → 410 until those venues have pages. Two-line change. **Awaiting approval.**

### 2. Copy changes in `VENUE_SEO.bali` (awaiting wording approval)
- Badge line above H1: `Beachfront dining in Kuta` → `Beachfront seafood restaurant at Discovery Mall, Kuta Beach, Bali`. Keep the H1 slogan.
- New FAQs covering searches already in GSC and target keywords: sunset time and seating, where in Discovery Mall, kid-friendly, free-flow beer, romantic dinner.
- Do **not** target `halal` (pork and alcohol are served).
- Optional: today's sunset time in the hero ("Sunset today 18:24, book a beachfront table").

### 3. Later
- Indonesian version (`/id/bali` + hreflang) for domestic searchers (93% of impressions are from Indonesia).
- Full menu as HTML (`/bali/menu` + `Menu` schema) only if "gioi ocean gourmet menu" (pos 6–7) matters.

## Manual tasks (not code)

| Task | Detail |
|---|---|
| Google Business Profile links | Website: `https://gioigroup.com/bali?utm_source=google&utm_medium=organic&utm_campaign=gbp`. Reservations: `https://book.gioigroup.com/bali/book`. Menu: menu PDF. Make sure nothing still points to `www.gioigroup.com/brands/gioi-ocean-gourment` |
| Price consistency | Keep site and Maps on IDR 250–300k. Ask Chope to close or update the old listing (shows Rp 400–550k, ranks on page 1 for the brand) |
| Reviews | QR code on the bill linking to the Google review URL (same as the feedback button) |
| Listicle outreach | Pitch inclusion in Honeycombers, The Bali Guideline, Finns "best beachfront / Kuta restaurants" lists |

## Keyword targets for /bali

Always say "Kuta, Bali" or "Kuta Beach": many autocomplete results are for Kuta, Lombok.

| Priority | Keywords | Notes |
|---|---|---|
| A: protect | gioi ocean gourmet (bali), gioi bali, gioi ocean gourmet menu | Already positions 1–3 |
| B: easiest | restaurant discovery mall bali, discovery mall bali restaurant, restoran di discovery mall, cafe discovery mall | Low competition (Klook lists); already #1 for "discovery mall restaurants" |
| B | seafood restaurant kuta bali, seafood kuta beach, best seafood restaurant kuta | Page 1 is mostly Wanderlog/TripAdvisor lists |
| B | sunset restaurant kuta bali, sunset dinner kuta beach, kuta beach sunset restaurant | Competitors cluster in Canggu/Uluwatu/Seminyak |
| B | beachfront restaurant kuta bali, kuta beach restaurants with a view, restaurant near kuta beach | Matches the venue |
| C: Indonesian | seafood di kuta bali, restoran seafood di kuta, tempat makan di kuta bali, seafood bali pinggir pantai | Needs Indonesian copy |
| C: occasion | romantic dinner kuta bali, candle light dinner kuta bali, breakfast kuta beach, brunch kuta bali | One FAQ/paragraph each |
| Skip | halal, Kuta Lombok / Mandalika, generic "best restaurants in Kuta" | Wrong fit; get listed in the listicles instead |

## Reference

GSC queries already landing on /bali: `gioi` (1.6), `gioi ocean gourmet bali` (2), `gioi ocean gourmet` (2.6), `gioi bali` (1), `menu gioi ocean gourmet` (6.3), `salmon lodeh` (10), `discovery mall restaurants` (1), `free flow beer` (1), `kid friendly` (2).

Pull a 3-month GSC export before the next round; 24h is too small for trends.
