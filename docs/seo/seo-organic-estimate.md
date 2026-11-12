# SEO plan: GIOI Ocean Gourmet Bali (`gioigroup.com/bali`)

Scope: `apps/web`, venue `/bali`. Last updated 2026-11-12. Booking flow lives on `book.gioigroup.com` and stays `noindex`.

Evidence labels: **[GSC]** Google Search Console, pulled 2026-11-12 (28-day window, but Google holds only Nov 8-10, 2026). **[SERP]** web search results on 2026-11-12. **[CODE]** read in `apps/web`. **[MENU]** `public/menus/bali-menu.pdf`. **[INFERENCE]** planning assumption, not a measurement.

## 1. Baseline [GSC]

| Metric | Value |
|---|---|
| Clicks / impressions / CTR / avg position | 28 / 1.92K / 1.5% / 9.1 |
| Indexed / not indexed pages | 11 / 13 |
| Not-indexed reasons | `noindex` tag 5, redirect 2, crawled-not-indexed 3, 5xx 1, duplicate no canonical 1, Google chose other canonical 1. Every reason is "Validation: Not Started". |
| Not-indexed URLs [GSC] | `noindex` (all crawled Nov 5-7): `www.gioigroup.com/`, `http://www.gioigroup.com/`, `/index.html` on `www`, `http://www` and apex. 5xx: `www.gioigroup.com/brands/gioi-bistro-and-cafe` (Nov 10). Duplicate without canonical: `ipv6.gioigroup.com/`. Crawled-not-indexed: `ipv6.gioigroup.com/bookings`, `/exclusive-offers`, `/brands/sinar-mandala`. Google chose another canonical: `gioigroup.com/` (Nov 11). |
| Sitemap | `https://gioigroup.com/sitemap.xml`, submitted Nov 9, read Nov 12, Success, **3 discovered pages** |
| Core Web Vitals | no data (not enough traffic) |
| HTTPS | 8 URLs, 0 non-HTTPS |
| Links report | still processing |
| Traffic split | Indonesia 92% of impressions; mobile 79% |

Top queries and pages [GSC]:

| Query | Clicks | Impr. | Pos. | Note |
|---|---|---|---|---|
| gioi ocean gourmet | 9 | 96 | 1.5 | brand; CTR 9.4% is healthy |
| gioi group | 2 | 11 | 1.5 | |
| gioi bali / gioi ocean gourmet bali / gioi jakarta | 1 each | 9 / 8 / 7 | 2-3 | |
| gioi ocean gourmet menu / menu gioi ocean gourmet | 0 | 13 / 4 | 6.5 | menu intent, page does not answer it in HTML |
| salmon lodeh gioi / lodeh salmon / salmon lodeh | 0 | 6 / 7 / 4 | 1.5-7 | signature-dish intent |
| gioi kuta | 0 | 6 | 1.0 | |
| restoran di discovery mall bali | 0 | 4 | 1.2 | location intent |

| Page | Clicks | Impr. | CTR | Pos. |
|---|---|---|---|---|
| `gioigroup.com/bali` | 8 | 149 | 5.4% | 3.1 |
| `www.gioigroup.com/` | 8 | 1,277 | 0.6% | 10.9 |
| `www.gioigroup.com/brands/gioi-ocean-gourment` | 7 | 230 | 3% | 4.5 |
| other `/brands/*`, `/exclusive-offers`, `/terms-conditions` | 11 | 790 | | 5-9 |

Read: `/bali` converts well but has few impressions. Most impressions sit on old `www.` URLs from a previous site version.

## 2. Current state

| Area | Status |
|---|---|
| Indexable pages in code | `/`, `/bali`, `/privacy`. Booking, confirmation and feedback send `X-Robots-Tag: noindex` for every venue slug. Staff pages are `Disallow`ed. Unknown venue slugs return 404 (503 if the API is down) [CODE]. |
| On-page SEO | Title, description, canonical, `og:*`, `twitter:*`, `lang`, landmarks, descriptive alt text. Since 2026-11-12: "About" section right after the hero, "Signature dishes" section, expanded FAQ. English only; Indonesian searchers need a future `/id/bali` with `hreflang` (action 8). |
| Structured data | `Restaurant` JSON-LD with `@id`, `description`, `sameAs`, `containedInPlace` (Discovery Mall Bali), address, phone, hours, `geo`, `priceRange`, cuisine, `hasMenu`, `parentOrganization`, `acceptsReservations`, `ReserveAction` (`inLanguage` en). `FAQPage` JSON-LD from the visible FAQ. No `postalCode`. |
| Images | Self-hosted WebP, hero preloaded, visible on first paint. |
| Menu | 2 PDFs. HTML shows only four signature dishes with prices. Full menu is not text on the page. |
| Security headers | Defined in `vercel.json` including a CSP; HSTS, nosniff, frame and referrer policies. |
| Redirects | `vercel.json`: `book.*` landing paths to `gioigroup.com` (301), `/brands/:path*` to `/bali` (**301, wildcard**), trailing slash to none. See section 5, risk 1. |
| Sitemap / robots | `sitemap.xml` lists `/`, every `VENUE_SEO` slug, `/privacy` (no `lastmod`). `robots.txt` disallows staff paths and points at `https://gioigroup.com/sitemap.xml`. `llms.txt` is generated. |
| Off-page | Rich third-party presence: Tripadvisor, Chope (4.1 from 56 reviews), Masaya Trip, Wanderlog (4.9 from 3,519), lokasibali (4.9), 2bearbear review, Klook. Google Business Profile status not recorded. |

## 3. What limits growth now [SERP]

1. **Third parties outrank the brand page.** For "gioi ocean gourmet" the first results are Masaya Trip (reseller), 2bearbear, Chope, Tripadvisor, lokasibali, Wanderlog. `/bali` is not in the top 8.
2. **Old URLs hold the impressions.** `www.gioigroup.com/…` pages and the misspelled `/brands/gioi-ocean-gourment` still rank; `/bali` carries only 149 impressions.
3. **Duplicate hosts and paths.** `ipv6.gioigroup.com` has its own AAAA record (`2001:df1:7800:2::8:e21a`, not Vercel; checked 2026-11-12) that Google crawled and indexed as a separate site. `gioigroup.com/index.html` returned 200 (duplicate of `/`) until the redirect added to `vercel.json`. `www.` already 308-redirects to apex (verified with `curl`); the `www` rows in Search Console are stale crawls.
4. **Thin text before this change.** About 135 words and menu in PDFs.
5. **Local pack and aggregators own generic queries.** Klook, Chope, Flokq, Bali Buddies and What's New Indonesia rank for Kuta and Discovery Mall discovery queries; `/bali` ranks in some Indonesian long-tail results only.
6. **The "reservasi" answer belongs to Chope, Grab and WhatsApp** (AI Overview, 2026-11-09). `/book` is `noindex`, so only `/bali` and the GBP booking link can displace them.
7. **No authority.** No known backlinks; Links report still processing.

## 4. Keyword map for `/bali`

No volume data exists. Priority is by Search Console impressions, SERP competition and intent. Do not target generic listicle queries.

| Priority | Cluster | Keywords | Evidence | Where it lives on the page |
|---|---|---|---|---|
| 1 | Brand | gioi ocean gourmet, gioi ocean gourmet bali / kuta, gioi bali | 96 impr., pos 1.5 | title, H1 region, About section, JSON-LD name |
| 2 | Brand + reservation | gioi ocean gourmet reservasi, reservasi gioi bali, gioi bali reservation | AI Overview cites Chope/Grab | title ("Table Reservations"), description, CTA, FAQ |
| 3 | Brand + menu / price | gioi ocean gourmet menu, menu gioi bali, harga | 17 impr. pos 6.5; `/bali` already #4 for a menu query | Signature dishes, menu PDF links, FAQ |
| 4 | Signature dish | salmon lodeh gioi, OG seafood platter | 17+ impr. at pos 1.5-7; generic "salmon lodeh" is recipe intent, skip | Signature dishes |
| 5 | Location | restoran di Discovery Mall Bali, restoran Kartika Plaza Kuta, restoran dekat Pantai Kuta | pos 1.2 on 4 impr. | About, FAQ, Visit, JSON-LD |
| 6 | Experience (ID) | tempat makan romantis di Kuta, dinner pinggir pantai Kuta, restoran seafood Kuta | `/bali` appears in the SERP for the long form; needs `/id/bali` (action 8) | not on the English page |
| 7 | Experience (EN) | beachfront restaurant Kuta, seafood restaurant Kuta, sunset dinner Kuta | listicles dominate; GBP and links matter more | title, H2s, alt text |
| 8 | Dietary / FAQ | menu pork, vegetarian, jam buka | menu legend shows pork, seafood, plant-based marks [MENU] | FAQ |

Avoid: "best seafood Bali", "restaurants in Kuta", generic recipe terms, Jakarta venue names.

## 5. Risks and open decisions

1. **`/brands/:path*` → `/bali` (301) sends Penn, The Brassey, Sinar Mandala and the Jakarta pages to a Bali page.** Google treats mass redirects to an unrelated page as soft 404, and those URLs carry about 800 impressions. Decide: keep only `/brands/gioi-ocean-gourmet` and `/brands/gioi-ocean-gourment` → `/bali`, and let other `/brands/*` return 404/410 until pages exist.
2. **`ipv6.gioigroup.com`.** Delete the DNS record (or point it at Vercel and redirect to apex). It is a live duplicate host serving old pages. After the fixes in this section, click "Validate fix" for each reason in Search Console; `noindex` and 5xx on `www` look already resolved (`/` serves no robots tag, `www` redirects), but validation is `Not Started`.
3. **Price range conflict.** JSON-LD `priceRange` is IDR 250,000 - 300,000. Menu mains are 95K-455K [MENU]; Chope shows Rp 400,000 - 550,000. Confirm with the venue before changing.
4. **Other old URLs.** `/exclusive-offers`, `/faq`, `/whats-on`, `/bookings`, `/terms-conditions` are not served by this app. Return 404/410 or redirect deliberately.
5. **Booking funnel.** Old group pages link to `linktr.ee/gioigroup`. `/bali` links to `book.gioigroup.com/bali/book`; keep it that way.
6. **Pork and alcohol.** The menu has pork dishes and the venue serves alcohol. Do not add halal claims.
7. **Address.** Tripadvisor shows "Jl. Kartika Plaza, Kuta"; the site uses "Discovery Mall Bali". Both are in the copy; confirm `postalCode` before adding it.

## 6. Checklist (in order)

1. Search Console: URL-inspect the 5 `noindex`, 3 crawled-not-indexed and 1 5xx URL; confirm each is expected. Request indexing of `/bali` after deploy.
2. Decide risk 1 and risk 2; apply in `vercel.json` / Vercel domains.
3. Verify headers: `curl -sI https://gioigroup.com/bali/book` returns 301 to `book.gioigroup.com`; `book.gioigroup.com/bali/book` carries `X-Robots-Tag: noindex`; `curl -sI https://gioigroup.com/index.html` returns 301 to `/` after deploy.
4. Confirm `NUXT_PUBLIC_SITE_URL`, `NUXT_PUBLIC_BOOK_URL` match production; `NUXT_PUBLIC_API_BASE` stays `https://gioi-api.vercel.app`.
5. Confirm `*.vercel.app` production URL does not compete with the canonical.
6. Run Rich Results Test on `/bali` (Restaurant and FAQPage) and `seomator audit https://gioigroup.com/bali --crawl -m 20 --mobile --format llm`.
7. Legal review of `/privacy`.
8. Re-pull Search Console after 4 weeks.

## 7. Actions, in order

| # | Action | Why | Effort |
|---|---|---|---|
| 1 | Claim or complete the Google Business Profile: name, address, hours, menu link, photos, booking link `/bali/book?src=gbp`, categories Seafood restaurant + Asian restaurant | Main driver for local and Maps; Wanderlog already shows 4.9 from 3,519 reviews, so mirror that on GBP | Low |
| 2 | Keep name, address, phone identical on site, GBP, Chope, Masaya Trip, Tripadvisor, Wanderlog; link each to `/bali` | Brand SERP is held by these sites | Low |
| 3 | Collect and answer real reviews on GBP | Strongest local signal | Ongoing |
| 4 | Add `aggregateRating` only when the same reviews are visible on `/bali` | Fake or hidden ratings risk a penalty | Low |
| 5 | Full HTML menu at `/bali/menu` with `Menu`/`MenuItem` markup, prices as in the PDF | Captures menu and dish queries (priority 3-4) | Medium |
| 6 | Compress `bali-menu.pdf` (2.7 MB) | Mobile speed | Low |
| 7 | Split JSON-LD address (`streetAddress`, `postalCode`) once verified | Cleaner GBP match | Low |
| 8 | Add `/id/bali` with `hreflang` if Indonesian queries show impressions | Indonesian coverage; `/bali` is English only | Medium |
| 9 | Local links: Discovery Mall Bali site, Instagram bio link to `/bali`, Bali food blogs and Indonesian dinner listicles (Nibble, Bobobox, Traveloka explore) | Authority for experience queries | Medium |
| 10 | Self-host Fontshare fonts; add About and Contact pages | Speed and trust | Medium |
| 11 | Replace GSAP reveal animations with CSS on `/bali` | Less JS on the main page | Medium |
| 12 | Add `lastmod` to the sitemap from real content dates | Faster recrawl | Low |

## 8. Timeline `[INFERENCE]`

The clock starts when changes are deployed and `/bali` is re-requested in Search Console. Planning guides, not forecasts.

| Phase | Conservative | Base | Optimistic |
|---|---|---|---|
| Weeks 0-2 | New title and content recrawled | Title shows; brand query stays #1-2 | `/bali` beats Masaya Trip for the brand query |
| Weeks 2-8 | Brand and menu impressions grow | Menu and dish queries reach page 1 | Local and ID long-tail impressions growing |
| Months 3-6 | Little non-brand traffic | Non-brand local queries page 2 to 3 | Local queries page 1 |
| Months 6-12 | Non-brand small | Steady organic plus Maps | Meaningful share of bookings |

Targets for the first 8 weeks after deploy, versus baseline 149 impressions and 8 clicks for `/bali`: impressions at least 600, brand CTR stays above 8%, `/bali` average position 3 or better across brand and menu queries. Most discovery will come from Maps and the Business Profile; treat site organic as the smaller channel.

AI Overview change `[INFERENCE]`: expect 2 to 8+ weeks after `/bali` ranks and the GBP booking link is set. Snippet and title changes usually show within 1 to 4 weeks after recrawl.

## 9. Additional venues

Metadata is keyed by slug in `utils/venueSeo.ts`. Each new venue needs:

- one `VENUE_SEO` entry (title, description, city, geo, price range, image, menus, and the `page` content block: `about`, `signatures`, `faqs`);
- its photos in `public/images/venues/<slug>/`;
- a `'/<slug>': { prerender: true }` rule in `nuxt.config.ts` (the noindex rules for booking pages already cover every slug);
- its own GBP, menu text and local content.

## 10. Metrics

| Metric | Source | Check |
|---|---|---|
| Indexed pages, coverage errors | Search Console | Weekly in month 1 |
| `/bali` impressions, clicks, CTR, position; brand, menu, location, ID queries | Search Console | Weekly, then monthly |
| Calls, direction requests, website and booking-link clicks | Google Business Profile | Monthly |
| Reservations started from organic | PostHog / Vercel Analytics | Monthly |
| Review count and rating | GBP | Monthly |
| Core Web Vitals (LCP, CLS, INP) | Search Console / PageSpeed | Monthly once data exists |
| Brand SERP: rank vs Masaya Trip, Chope, Tripadvisor | manual | Monthly |

Replace the section 8 assumptions with real baselines after 4 to 8 weeks of data.
