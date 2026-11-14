# /bali SEOmator deep audit (2026-11-13)

Target: `https://gioigroup.com/bali` (single page; homepage and other venues not built).
Tool: SEOmator (`llm-skills/seo-audit-skill`), all 373 rules, Core Web Vitals + mobile render, no crawl.
Command: `node dist/cli.js audit https://gioigroup.com/bali --mobile --format json --no-save`
Raw JSON: `llm-skills/seo-audit-skill/reports/gioigroup-bali-audit.json`
Companion: [2026-11-13-bali-seo-audit.md](2026-11-13-bali-seo-audit.md) (handoff, decisions, done/not done). Findings below that it already covers are marked.

**Overall: 95/100.** 3 failures, ~45 warnings, ~45 rules not measured (need `--crawl`).

## Core Web Vitals (lab, cold run)

| Metric | Value | Status |
|---|---|---|
| LCP | 0.79s | good |
| CLS | 0.002 | good |
| FCP | 0.34s | good |
| TTFB | 123ms | good |
| INP | n/a | lab cannot measure; needs CrUX/RUM or `--simulate-interaction` |

## Category scores

| Category | Score | Category | Score |
|---|---|---|---|
| E-E-A-T | 75 | Crawlability | 99 |
| Mobile | 81 | A11y | 99 |
| Performance | 86 | Links | 99 |
| Images | 89 | Core, Technical, URL, i18n, Legal, JS, Redirects, HTML | 100 |
| Social | 89 | Security | 93 |
| GEO / AI | 91 | Content | 93 |
| Schema | 94 | | |

## Failures

| Rule | Finding | Action |
|---|---|---|
| `security-csp-xss` | CSP `script-src` allows `'unsafe-inline'` without nonce/hash | Move to nonces/hashes (Nuxt/Vercel config). Check first what needs inline scripts (analytics, JSON-LD) |
| `content-text-html-ratio` | 3.1% (3.7KB text / 122KB HTML) | ~80KB is inline CSS; extract to external file. Also fixes `perf-css-file-size` and `perf-page-weight` |
| `mobile-horizontal-scroll` | 10 elements flagged (img width attrs 1600/480 over viewport) | **False positive**: measured `scrollWidth` 390 at 390px viewport (see companion doc). Ignore |

## Warnings, by priority

### Performance / images (user-visible)
- `perf-lcp-hints`: LCP image (header img) has no preload or `fetchpriority`. Companion doc says the hero is preloaded with `fetchpriority=high`; the flagged candidate is the header image, probably the logo. Verify which element is LCP.
- `perf-lazy-above-fold`: 1 above-the-fold image has `loading="lazy"`. Remove it.
- `images-lazy-loading`: 1 below-the-fold image is not lazy (12.5%).
- `perf-image-encoding`: 4 images >100KB, e.g. `dish-salmon-lodeh.webp` 271KB, `outlet-06.webp` 248KB.
- `images-size`: `outlet-06.webp` is 1600x1600 (2.6MP); `dish-jimbaran-king-prawn.webp` flagged by filename.
- `images-responsive`: no `srcset`/`sizes` (82% of images).
- `perf-asset-cache-policy`: `logo-96.webp`, `logo-480.webp` served with `max-age=0` (3 of 31 assets, the third is a PostHog ingest URL). Set long immutable cache.
- `perf-font-loading`: 7 font files.
- `perf-page-weight`: HTML 119KB (>100KB), see inline CSS above.
- `perf-http2`: no `alt-svc` header (informational).

### Structured data
- `schema-breadcrumb`: no `BreadcrumbList`.
- `schema-local-business`: Restaurant missing `openingHours`. Companion doc says hours are present; probably `openingHoursSpecification` is used instead of the `openingHours` string. Low value, check only.
- `schema-organization`: valid, with suggestions.

### E-E-A-T / trust (7 warnings, score 75)
- No about page link; no author byline; no editorial policy; no physical address in markup (add a visible address block matching schema); only one contact method (phone); no authoritative external citations; no geo meta tag.
- Byline, editorial policy and citations are low relevance for a restaurant landing page. Address, contact methods and about link are worth doing.

### Social
- `social-share-buttons`: WhatsApp only. `social-profiles`: Instagram only. The `sameAs` change in the companion doc adds Google Maps and TripAdvisor to JSON-LD; visible links are still missing.

### GEO / AI discoverability
- No `llms.txt`, `AGENTS.md`, `.well-known` MCP/agent-card manifest, or Markdown representation. Optional; `llms.txt` is the cheapest.

### Security (minor)
- `security-ssl-protocol`: HSTS lacks `preload` (max-age 63072000 and includeSubDomains are fine). `security-trusted-types`: no `require-trusted-types-for 'script'`.

### Minor
- `crawl-sitemap-lastmod`: sitemap has no `<lastmod>` (2 URLs).
- `mobile-font-size`: 3 line-height values of 1 / 1.1 (<1.2).
- `a11y-label-name-mismatch`: 1 control's accessible name omits visible text.
- `links-anchor-text`: 1 non-descriptive link (6.3%).
- `content-heading-length`: 2 headings <10 chars.

## Not measured

- Needs `--crawl` or 2+ pages (~45 rules): click depth, orphans, inbound links, duplicate titles/descriptions/content, canonical chain/loop, hreflang reciprocity, sitemap cross-checks, schema entity consistency, NAP consistency. Re-run when more venue pages exist: `seomator audit https://gioigroup.com --crawl -m 50 --format llm`.
- INP: use CrUX/RUM once the property has traffic.
- `a11y-color-contrast`: contrast is set in stylesheets; needs a manual or axe check.
- `perf-minify-js`: 16 external scripts had no `content-length`, so size could not be read.

## Discrepancies with the companion doc

| Item | Companion (earlier crawl) | This run |
|---|---|---|
| Score | 94/A | 95 |
| LCP | 4.47s cold, 212ms warm | 0.79s |
| Horizontal scroll | false positive | still flagged, same cause |

Lab results vary with cache state; treat CWV as indicative until CrUX field data exists.

## Suggested next steps (cheapest first)

1. Remove `loading="lazy"` from the above-fold image; set long cache on logo files.
2. Compress `dish-salmon-lodeh.webp`, `outlet-06.webp` (resize to display size); add `srcset`.
3. Extract inline CSS (~80KB) to a cached external file.
4. Add `BreadcrumbList`, visible address and secondary contact method, about link.
5. Replace CSP `unsafe-inline` with nonces/hashes.
6. Add `<lastmod>` to the sitemap, `llms.txt`.

## Implementation status (2026-11-14, uncommitted)

Scope rule: no copy or layout change; small typographic/markup tweaks allowed. Verified by `pnpm build` and the prerendered `/bali` HTML (122KB to 42KB, zero inline `<style>`, two external CSS files). Not deployed; re-run SEOmator after deploy to confirm scores.

| Audit item | Change |
|---|---|
| `content-text-html-ratio`, `perf-css-file-size`, `perf-page-weight` | `nuxt.config.ts` `features.inlineStyles = false`. Trade-off: two render-blocking CSS requests; check LCP after deploy |
| `perf-lazy-above-fold` | Removed `loading="lazy"` from the About-section logo (SEOmator's viewport counts it above the fold) |
| `images-lazy-loading` | Footer logo (the flagged image) now `loading="lazy"` |
| `perf-lcp-hints` | SEOmator's LCP candidate is the header logo; it now has `fetchpriority="high"`. Hero keeps its preload, which now carries `imagesrcset`/`imagesizes` |
| `images-responsive` | Hero: 800/1200/1600w variants. Signature dishes: 640w variants. Scene images left alone: `object-cover` into a 4:5 card makes the 1600px original about 1.8x the displayed width, so smaller variants would visibly soften them |
| `perf-image-encoding` | Re-encoded webp >100KB at q78, same dimensions: outlet-06 254 to 227KB, outlet-07 224 to 207KB, salmon-lodeh 278 to 232KB, crispy-duck 168 to 138KB, outlet-02 207 to 190KB, og-seafood-platter 223 to 185KB. outlet-05 kept (re-encode larger). Mobile now gets 38-130KB variants for hero and dishes |
| `perf-asset-cache-policy` | `vercel.json` immutable Cache-Control for `/logo-480.webp`, `/logo-96.webp` (unhashed names; rename on change) |
| `schema-breadcrumb` | Standalone `BreadcrumbList` JSON-LD |
| `schema-local-business` | `openingHours` string array next to `openingHoursSpecification` |
| geo meta tag (E-E-A-T) | `geo.region`, `geo.placename`, `geo.position`, `ICBM` meta (region hardcoded `ID-BA`; move to `VenueSeo` for a non-Bali venue) |
| `crawl-sitemap-lastmod` | `<lastmod>` = request date, not the real content date |
| `a11y-label-name-mismatch` | Instagram aria-label now `@gioioceangourmet on Instagram` (contains the visible text) |
| `links-anchor-text` | Header logo link had no text: img `alt=""` plus `sr-only` "GIOI Ocean Gourmet, home" |
| `mobile-font-size` | Base `h1,h2,h3` line-height 1.1 to 1.2; `leading-none` removed from header link (now `flex`) and FAQ "+" glyph. Page headings keep their explicit `leading-[0.98..1.05]` (display type; changing them alters layout) |
| `social-profiles` | Visible Google Maps and TripAdvisor buttons added after Instagram in the Visit section (same `btn-secondary` style, URLs from `sameAs`). Only layout addition; wraps in the existing flex row |
| `security-ssl-protocol` | HSTS header now includes `preload`. Submission to hstspreload.org is a separate, hard-to-reverse step, not done |

Not done:
- `content-heading-length` ("Breakfast", "Hours"): needs copy change.
- E-E-A-T visible address block (an `<address>` already exists in Visit), second contact method, about link: layout additions.
- `perf-font-loading`: 5 woff2 files, all weights in use; reducing changes typography.
- `security-csp-xss` (nonces/hashes) and Trusted Types: Nuxt prerender plus inline theme/JSON-LD/PostHog scripts need a CSP module and testing; high risk of breaking the page.
- `perf-http2` (`alt-svc` is platform-set), `.well-known` agent manifests and Markdown representation (speculative, no consumer). `llms.txt` already exists.
- `images-size` for scenes (see above); `schema-organization` suggestions.
