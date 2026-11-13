# /bali SEO audit and handoff (2026-11-13)

Scope: `gioigroup.com/bali` (GIOI Ocean Gourmet, Kuta). The group homepage and other venues are not built yet and are out of scope for now.

Inputs: GSC "Performance on Search" export (last 24h only: 564 impressions, 9 clicks), SEOmator crawl (score 94/A), live curl checks, Google autocomplete (gl=id), web search.

## Status

### Done in code

Rows 1–5 are committed in `d332a38`; rows 6–8 are uncommitted. Nothing is deployed yet: live `/exclusive-offers` still returns 500.

| Change | Files | Verified |
|---|---|---|
| Unknown URLs returned **500** to browsers/Googlebot (404 only for curl). Cause: Pinia 2.3.1 `shouldHydrate` calls `obj.hasOwnProperty` on a null-prototype payload object while rendering `error.vue`. Fix: `pinia@^3.0.4`, `@pinia/nuxt@^0.11.3` | `apps/web/package.json`, `pnpm-lock.yaml` | Local prod build: `/zzz`, `/exclusive-offers` → 404 "Page not found"; `/bali` → 200 |
| Title shortened to `GIOI Ocean Gourmet Bali \| Beachfront Seafood in Kuta` (was 73 chars, truncated; Google already rewrote it to this) | `apps/web/utils/venueSeo.ts` | Rendered in local build |
| `sameAs` + Google Maps CID `https://maps.google.com/?cid=3840486500794243861` and TripAdvisor | `apps/web/utils/venueSeo.ts` | JSON-LD in local build |
| `/privacy` (noindex) removed from sitemap | `apps/web/server/routes/sitemap.xml.ts` | Local `/sitemap.xml` |
| "Share your visit on Google" button on feedback thank-you screen, shown to **every** guest (no rating gating: Google policy). `reviewUrl` field, Place ID `ChIJraC4OABH0i0RFRuG7B8mTDU` (verified resolves to the listing) | `apps/web/utils/venueSeo.ts`, `apps/web/pages/[venue]/feedback/[code].vue` | Typecheck clean (except 4 pre-existing `pos` errors in `venueSeo.ts`). Thank-you screen not viewed: needs a completed reservation |
| Legacy redirect narrowed: only `/brands/gioi-ocean-gourment` 301 → `/bali`. Other `/brands/*` (Penn, Brassey, Sinar Mandala, Shabu Baru, GIOI Cafe) now get Nuxt's 404 instead of a soft-404 redirect to a Bali page. Vercel redirects can't return 410; 404 drops them from the index just as well | `apps/web/vercel.json` | Local prod build: `/brands/penn` → 404 (the `vercel.json` rule itself only applies on Vercel) |
| Copy (owner decision, see below): badge, Discovery Mall location FAQ, kid-friendly FAQ with high chairs | `apps/web/utils/venueSeo.ts` | Local build: text present in HTML and FAQPage JSON-LD |
| `pos?: number` added to the `signatures` type (fixes the 4 pre-existing typecheck errors) | `apps/web/utils/venueSeo.ts` | `pnpm typecheck` clean |

After deploy:
- GSC → URL Inspection → `/bali` → Request indexing.
- Inspect `/exclusive-offers` and `/brands/penn` in GSC: must be 404, not 500.
- Inspect `https://www.gioigroup.com/brands/gioi-ocean-gourment` in GSC (Google still shows it with the old title "GIOI - GIOI Ocean Gourment"). It must redirect to `/bali`; Google swaps the result once it recrawls. The trailing-slash variant used to return 500; the rule now uses `{/}?` to cover it.
- On staging, complete one reservation, submit feedback, confirm the Google button opens the review dialog.

### Checked and fine
- Mobile: 390px viewport, `scrollWidth` 390 (SEOmator "horizontal scroll" is a false positive).
- Warm cache: LCP 212ms, TTFB 41ms (SEOmator 4.47s LCP was a cold miss).
- One H1, hero image preloaded with `fetchpriority=high`, all images have alt, Restaurant schema (hours, geo, menus, ReserveAction) + FAQPage.
- Signature dishes with prices already in HTML; full menus are PDFs (enough for now).

## Decisions

### 1. Legacy `/brands/*` redirect: done
Previously every `/brands/*` URL 301'd to `/bali`, including the Jakarta/PIK venues. Now only the Ocean Gourmet URL does; the rest return 404 until those venues have pages. When a Jakarta venue page ships, redirect its old `/brands/<slug>` URL to it.

### 2. Copy changes in `VENUE_SEO.bali`: done (owner decision 2026-11-13)
Owner: of the legacy keywords only **discovery mall restaurant** and **kid-friendly** are still relevant; the rest (free-flow beer etc.) are not offered/targeted anymore.
- Badge above H1 → `Beachfront seafood restaurant at Discovery Mall, Kuta Beach, Bali`. H1 slogan kept.
- FAQ "Where are you located?" → "Where in Discovery Mall Bali is the restaurant?" (ground floor, beach side, Jl. Kartika Plaza).
- New FAQ "Is GIOI Ocean Gourmet kid-friendly?": families welcome, high chairs available. No kids play area, so don't claim one.
- Dropped: free-flow beer, sunset-time FAQ, romantic dinner FAQ. Do **not** target `halal`.

### 3. Not doing now
- Indonesian version (`/id/bali` + hreflang): excluded by decision on 2026-11-13, even though most Discovery Mall searches are in Indonesian (see Reference).
- Full menu as HTML (`/bali/menu` + `Menu` schema): only if "gioi ocean gourmet menu" (pos 6–7) starts to matter.
- Group homepage and other venues: not built yet, out of scope.

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

### GSC export "Last 3 months" (pulled 2026-11-13)
The export only has data for 2026-11-08 to 2026-11-10 (3 days, 1,921 impressions, 28 clicks), so the property is new. Pull it again in about 4 weeks to see trends.

| Page | Clicks | Impr. | Pos |
|---|---|---|---|
| `/` (homepage) | 8 | 1,277 | 10.9 |
| `/brands/gioi-ocean-gourment` | 7 | 230 | 4.5 |
| `/brands/penn` | 3 | 193 | 7.3 |
| `/brands/the-brassey` | 3 | 159 | 5.4 |
| `/bali` | 8 | 149 | 3.1 |
| `/exclusive-offers` (still 500 live) | 3 | 91 | 7.3 |
| `/brands/sinar-mandala` | 1 | 97 | 9.3 |

Query impressions by cluster (1,220 attributed): Senopati/Jaksel 509 (homepage, Jakarta intent), Jakarta brands 316 (Penn, Brassey, Sinar Mandala, Setiabudi, Menteng, PIK), Bali 66.

- The Discovery Mall cluster is mostly searched in **Indonesian**: `restoran di discovery mall bali` (pos 1.25), `makanan di discovery mall (bali)` (4–4.5), `tempat makan di discovery mall bali` (1), `discovery mall food` (4), `discovery mall bali restaurant` (3). This backs the owner's pick and moves the `/id/bali` page up the list.
- `kid friendly` did not appear in this window.
- Jakarta brand pages still get about 450 impressions; redirecting them to `/bali` throws that away (supports decision 1). The homepage does not mention Penn, Brassey, Sinar Mandala or Senopati, so it is no better as a redirect target.
- Query `gioi menteng tutup` ("GIOI Menteng closed") showed up. Confirm with the owner which Jakarta venues are still open before planning pages for them.
