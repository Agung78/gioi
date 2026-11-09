# SEO organic growth estimate: GIOI Ocean Gourmet Bali

Scope: `apps/web` as of 2026-11-09, venue `/bali`. Domain `gioigroup.com` is not assigned yet.

> **Read this first.** No keyword-volume, ranking or Search Console data was available when this was written. Every number below is a planning assumption, marked `[INFERENCE]`, not a measurement. Replace them with Search Console data once the site is live.

## 1. Current state (verified)

| Area | Status |
|---|---|
| Indexable pages | 1 (`/bali`). Booking and confirmation pages are `noindex` by design; staff pages are `Disallow`ed. |
| On-page SEO | Title, meta description, canonical, `og:*`, `twitter:card`, `lang`, semantic landmarks, skip link: done. |
| Structured data | `Restaurant` JSON-LD with address, phone, opening hours, `geo`, `priceRange` (IDR 250,000 - 300,000), cuisine, `hasMenu` (2 PDFs), `parentOrganization`, `ReserveAction`. |
| Menu | 2 PDFs in `public/menus/`, linked from the page. The 2.7 MB food menu is heavy on mobile. |
| Content | About 135 words on the page. Thin for a ranking page. |
| Technical | SEOmator local score 88/B. The remaining mobile failures were checked and are false positives. |
| Security headers | Defined in `vercel.json`; not verifiable until deployed. CSP not added. |
| Sitemap / robots | `public/sitemap.xml` lists only `/bali`. It points at `www.gioigroup.com`, which is not live yet. |
| Domain | Not assigned. Canonical, sitemap and JSON-LD URLs point at a host that does not serve the app yet. |
| Off-page | No known backlinks, no Google Business Profile status recorded, no reviews data. `[INFERENCE]` all absent or unverified. |

## 2. What limits organic growth

1. **No live domain.** Until `gioigroup.com` serves `/bali`, Google cannot index the canonical URL. Organic traffic is effectively zero by construction.
2. **One page.** Only one page can rank. There is nothing for long-tail searches (menu, location, events, dietary).
3. **Thin content.** About 135 words, with the menu locked in PDFs.
4. **Local pack beats blue links.** For "restaurant Kuta" style queries, Google Maps results and travel aggregators (TripAdvisor, Google Maps, delivery and booking platforms) take most clicks. `[INFERENCE]` Kuta is a high-competition tourist area.
5. **No authority yet.** A new page on a domain with no history ranks slowly regardless of on-page quality.

## 3. Target queries

| Intent | Example queries | Realistic goal |
|---|---|---|
| Brand | "gioi ocean gourmet", "gioi bali" | Rank #1 within weeks of indexing |
| Local discovery | "beachfront restaurant Kuta", "seafood restaurant Kuta", "restaurant Discovery Mall Bali" | Local pack first, organic page 2 to 3 later |
| Generic tourist | "best seafood Bali", "restaurants in Kuta" | Unlikely to rank; aggregators dominate |
| Menu/price | "gioi ocean gourmet menu", "gioi bali price" | Page 1 with an HTML menu page |

## 4. Timeline and scenarios `[INFERENCE]`

Indexing and ranking start the day the domain serves the page. The ranges assume the checklist in section 5 is done and Google Business Profile is set up. They are planning guides, not forecasts.

| Phase (from domain live) | What happens | Conservative | Base | Optimistic |
|---|---|---|---|---|
| Weeks 0 to 2 | Crawl and index of `/bali` | Indexed | Indexed, brand query ranks | Brand #1 |
| Months 1 to 3 | Brand and menu queries stabilise | Brand traffic only | Brand + a few local impressions | Local impressions growing |
| Months 3 to 6 | Content and reviews start compounding | Little non-brand | Non-brand local queries page 2 to 3 | Local queries page 1 |
| Months 6 to 12 | Authority builds | Non-brand still small | Steady local organic plus Maps | Meaningful share of bookings |

Rough monthly organic visits at month 6 to 12, **before** adding more pages: conservative tens, base low hundreds, optimistic several hundred. `[INFERENCE]` Most restaurant discovery will come from Google Maps and the Business Profile, not the site's organic listing, so treat site-only organic as the smaller channel.

## 5. Checklist when `gioigroup.com` is assigned

Do these in order; each one affects indexing.

1. Point DNS at the Vercel project; choose **www or apex** and 301-redirect the other to it.
2. Set `NUXT_PUBLIC_SITE_URL` to the final host (canonical, `og:url`, JSON-LD and menu URLs all derive from it).
3. Set `NUXT_PUBLIC_API_BASE=https://gioi-api.vercel.app` (config, not secret) and redeploy so the prerender includes phone, address and hours.
4. Remove the `'/' -> '/bali'` redirect in `nuxt.config.ts` if the company homepage will live at `/`.
5. Confirm `sitemap.xml` and `robots.txt` are served from the final host. If the company site owns the root, add the venue URLs to its sitemap.
6. Verify the host in Google Search Console, submit the sitemap, request indexing of `/bali`.
7. Confirm the `*.vercel.app` production URL does not compete with the canonical (the canonical tag already points at the final host).
8. Re-run the SEOmator audit against the live URL: `seomator audit https://<host>/bali --crawl -m 20 --mobile --format llm`.

## 6. Highest-impact actions, in order

| # | Action | Why | Effort |
|---|---|---|---|
| 1 | Claim and complete the **Google Business Profile** (name, address, hours, menu link, photos, booking link) | Main driver for local results | Low |
| 2 | Collect real reviews and respond to them | Strongest local ranking signal after relevance and proximity | Ongoing |
| 3 | Keep name, address and phone identical across the site, GBP and listings | Consistency helps local ranking | Low |
| 4 | Add an HTML menu page (`/bali/menu`) with `Menu`/`MenuItem` markup; keep the PDFs as downloads | Gives search engines text to rank for menu queries | Medium |
| 5 | Add 300+ words of real copy: location, cuisine, ambience, hours, how to get there, FAQ | Fixes thin content | Medium |
| 6 | Compress `bali-menu.pdf` (2.7 MB) | Mobile speed | Low |
| 7 | Add `aggregateRating` only when it reflects real, visible reviews | Rich results; fake or hidden ratings risk a penalty | Low |
| 8 | Build local links: Discovery Mall site, Bali tourism and food blogs, Instagram profile link | Authority | Medium |
| 9 | Self-host the Fontshare fonts; add About, Contact and Privacy pages | Speed and trust | Medium |
| 10 | Add CSP in report-only mode first | Hardening without breaking booking | Medium |

## 7. Additional venues

The metadata is keyed by slug in `utils/venueSeo.ts`. Each new venue needs one entry (title, description, city, geo, price range, image, menus), its own GBP, and its own content. A venue page without its own entry falls back to database-only metadata, so add the entry before launch.

## 8. Metrics to track

| Metric | Source | Check |
|---|---|---|
| Indexed pages, coverage errors | Search Console | Weekly in month 1 |
| Impressions, clicks, average position for brand and local queries | Search Console | Weekly, then monthly |
| Calls, direction requests, website clicks, booking-link clicks | Google Business Profile | Monthly |
| Reservations started from organic | PostHog / Vercel Analytics | Monthly |
| Review count and average rating | GBP | Monthly |
| Core Web Vitals (LCP, CLS, INP) | Search Console / PageSpeed | Monthly |

Replace the section 4 assumptions with real baselines after the first 4 to 8 weeks of Search Console data.
