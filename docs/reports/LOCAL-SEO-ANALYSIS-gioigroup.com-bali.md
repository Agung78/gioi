# Local SEO Analysis: GIOI Ocean Gourmet Bali

URL: https://gioigroup.com/bali · Run: 2026-11-16 · Method: claude-seo `seo-local` (live page fetch, `apps/web` source, public listings). No GBP dashboard, Search Console, or paid tools.

## Local SEO Score: 74/100 (estimate)

| Dimension | Weight | Score | Basis |
|---|---|---|---|
| GBP signals | 25 | 17 | Strong listing (Google 4.9, ~3,200–3,500 reviews via mirrors); category and hours unverified/possibly off |
| Reviews & reputation | 20 | 18 | 4.9 Google, 4.9 Tripadvisor (764, claimed); review ask built into feedback flow |
| Local on-page | 20 | 15 | City in title, NAP + hours + tel link visible; H1 has no local terms; menu only as PDF |
| NAP & citations | 15 | 10 | Hours and category differ between site and Google; Bing/Apple unverified; stray "IQOS" Maps place at same address |
| Local schema | 10 | 9 | `Restaurant` with address, geo (7 dp), hours, phone, price, menu, ReserveAction, FAQ |
| Local links & authority | 10 | 5 | Blog reviews, Bali directories; Tripadvisor rank only #692 of 818 in Kuta despite 4.9; no "best of" list placement found |

**Business type:** Brick-and-mortar (ground floor beachfront, Discovery Mall Bali). **Vertical:** Restaurant.

## GBP checklist

| Signal | Status |
|---|---|
| Listing exists, linked from site | Yes: `maps.google.com/?cid=3840486500794243861`, place ID `ChIJraC4OABH0i0RFRuG7B8mTDU` |
| Rating / volume | 4.9 from ~3,240–3,533 reviews (lokasibali, Wanderlog, BaliFolio mirrors; snapshots differ) |
| Primary category | Mirrors tag it **Asian Restaurant**. Page and schema lead with seafood. Verify in GBP; the primary category is the top local pack factor |
| Hours | Mirror shows 10:00–22:00 daily. Site says Thu–Sat until 22:30. Verify GBP |
| Website link | Not verifiable without GBP access. Should be `https://gioigroup.com/bali` (UTM-tagged so GBP clicks are separable) |
| Reservation link | Not verifiable. Should be `https://book.gioigroup.com/bali/book?src=google` |
| Photos / posts | Not verifiable |

## Review health

| Platform | Rating | Count | Note |
|---|---|---|---|
| Google | 4.9 | ~3,240–3,533 | via third-party mirrors |
| Tripadvisor | 4.9 | 764 | claimed, #692 of 818 Kuta restaurants (rank weighs recency/volume; low despite rating) |

Review ask: `feedback/[code].vue` shows "Share your visit on Google" to every guest with no rating gate. Compliant with Google policy and keeps review velocity tied to bookings.

## NAP consistency

| Field | Site (page + schema) | Google (mirror) |
|---|---|---|
| Name | GIOI Ocean Gourmet | GIOI Ocean Gourmet |
| Address | Ground Floor Beach Front, Discovery Mall Bali, Jl. Kartika Plaza, Kuta, Badung, Bali 80361 | Discovery Mall Bali, Ground Floor Beach Front, Badung, Bali 80361 |
| Phone | +62 811 3960 6101 | not shown |
| Hours | Mon–Wed, Sun 10–22; Thu–Sat 10–22:30 | 10–22 daily |
| Cuisine | Seafood, Asian, Indonesian | Asian Restaurant |

Also found: a separate Google Maps place, "IQOS Nearby - GIOI Ocean Gourmet" (category Store), at the same address. It uses the restaurant name and can split or confuse brand results.

## Citations

| Source | Status |
|---|---|
| Google Business Profile | Present |
| Tripadvisor | Present, claimed |
| Instagram @gioioceangourmet | Present (1,849 followers) |
| Chope | Partnership revoked, but the public listing is still live with a "Book Now" form and old data |
| Wanderlog, lokasibali, BaliFolio, 2bearbear blog | Present (auto/editorial) |
| Bing Places | Not found (unverified) |
| Apple Business Connect | Not found (unverified) |
| Facebook page | Not found in search; report shows facebook.com referrals, so one may exist |

## Local schema

Present and valid on `/bali`: `Restaurant`, `BreadcrumbList`, `FAQPage`. No changes needed. Do not add `aggregateRating` from Google reviews: self-serving review markup on a LocalBusiness is not eligible for stars and violates Google's guidelines.

## Top 10 actions

| # | Priority | Action | Where |
|---|---|---|---|
| 1 | Critical | Make hours identical on GBP, site (`openingHours` in DB) and Tripadvisor. Pick the real Thu–Sat close time | GBP + Tripadvisor dashboards |
| 2 | Critical | Set GBP primary category to **Seafood restaurant** (if accurate); keep Asian, Indonesian, Restaurant, Bar as secondaries | GBP |
| 3 | High | Set GBP website = `https://gioigroup.com/bali?utm_source=google&utm_medium=organic&utm_campaign=gbp` and reservation link = `https://book.gioigroup.com/bali/book?src=google` | GBP |
| 4 | High | Ask Chope to remove the listing so guests can't book through a revoked channel | Chope support |
| 5 | High | Claim **Bing Places** (import from GBP) and **Apple Business Connect** | bingplaces.com, businessconnect.apple.com |
| 6 | High | Report or rename the "IQOS Nearby - GIOI Ocean Gourmet" Maps place so the restaurant name isn't shared with a store | Google Maps "Suggest an edit" |
| 7 | Medium | Put local terms in the H1, e.g. visually keep the hero lines but make the H1 "Beachfront seafood restaurant in Kuta, Bali" | `pages/[venue]/index.vue`, `venueSeo.ts` |
| 8 | Medium | Add an HTML menu section (dish names + prices) alongside the PDFs; PDFs rank poorly and aren't read well by AI answers | `/bali` page |
| 9 | Medium | Show social proof on page as plain text: "4.9 on Google · 3,000+ reviews" linking to the Maps listing (no rating schema) | `/bali` page |
| 10 | Low | Pitch Bali "best seafood / sunset restaurants in Kuta" lists and food bloggers; these are the top AI-citation source | Marketing |

## Limitations

Not assessed: GBP Insights, actual GBP category/attributes/photos/posts, live local pack and geo-grid rankings (`seo-maps` with DataForSEO), backlink profile and authority (Ahrefs/DataForSEO), Bing/Apple listing status (needs owner login). Google rating and hours come from third-party mirrors and may lag the live profile.
