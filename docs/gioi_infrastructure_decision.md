# GIOI Bali Infrastructure Decision Record

**Date:** 2026-11-07
**Status:** Accepted. Open items at the end must be answered before the build starts.
**Scope:** Q-GIOI-2026-001 (GIOI Ocean Gourmet, Bali), with the path to the group website and other outlets.
**Related:** `gioi_hosting_recommendation.md` has the setup steps. `gioi_group_site_change_request.md` covers the group website.

## Summary

| Decision | Choice | Main alternatives rejected |
|---|---|---|
| Framework | Nuxt (Vue 3) for the web app, Fastify for the API | Next.js |
| App hosting | Vercel Pro, functions pinned to Singapore (`sin1`) | Helipod, Cloudflare Pages + Render |
| Database | Neon Launch, Singapore (`aws-ap-southeast-1`) | Supabase Pro, Helipod Database |
| Backups | Neon point-in-time restore + daily `pg_dump` to Cloudflare R2 | Provider backups only |
| Staging | Vercel preview deployments and one custom environment, each with its own Neon branch | A permanent staging server |
| Domain | DNS stays at Rumahweb. Guests book on `book.gioigroup.com/<venue>`. Staff use `admin.gioigroup.com` | Moving DNS to Cloudflare. One subdomain per outlet |
| Group readiness | `venue_id` and a time zone for each venue in the data model | A separate deployment for each outlet |

Estimated cost: **~Rp 575.000–720.000 a month** including ~11% PPN, which is 11–14% of the Rp 5.000.000 monthly fee.

## Requirements that drove the decisions

The quotation and the scope documents set these constraints:

- Bali only. Other outlets and the group website need their own quotations.
- The architecture must be ready for the whole GIOI group.
- The Bali landing page is an SEO deliverable, including a backlinks strategy.
- The monthly fee includes hosting, the database, SSL, a CDN for the landing page, daily automated backups and uptime monitoring.
- Guests are "tourists booking on coastal mobile data" (`gioi_ui_design_spec.md`), so the landing page must load fast on slow networks.
- The system stores guest PII (allergies, accessibility, history), which falls under UU PDP.
- One developer builds it in weeks 2–5.

## Decision 1: Nuxt and Fastify, not Next.js

The prototype in `gioi/prototype` is Vue 3, Pinia, Vue Router and Vitest. Every other repo in the workspace uses Vue or Astro. None uses React. Next.js would mean rewriting the prototype in a framework the team does not use.

Nuxt gives the SEO that Next.js would. Each venue's landing page is prerendered to HTML at build time. The booking flow and the host and admin screens render in the browser:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
	routeRules: {
		'/bali': { prerender: true }, // one landing page per venue
		'/bali/book/**': { ssr: false },
		'/admin/**': { ssr: false },
		'/host/**': { ssr: false },
		'/guests/**': { ssr: false },
	},
})
```

The API stays in Fastify, because the owner writes the backend as a deliberate learning goal. Vercel deploys Fastify with no configuration ([Fastify on Vercel](https://vercel.com/changelog/zero-configuration-support-for-fastify)).

## Decision 2: Vercel Pro for hosting

| Option | Monthly cost | Why not |
|---|---|---|
| **Vercel Pro** | $20 (~Rp 330.000), $20 usage credit included | Chosen |
| Helipod Micro | Rp 125.250 | Founded in 2025. No CDN. Its dashboard was slow when the database page loaded during evaluation. A lapsed wallet suspends services, and suspended services are deleted after two days |
| Cloudflare Pages + Render | ~Rp 215.000 | Commercial use on Render Hobby was not confirmed. Fastify and the web app on two platforms |
| Vercel Hobby | $0 | Hobby is "restricted to non-commercial personal use only". Paid consultants count as commercial |

What Vercel gives this project:

- **A CDN for the landing page.** Vercel serves prerendered HTML from its edge network, which delivers the quotation's "CDN for landing page" with no extra service.
- **Functions next to the database.** Functions pinned to `sin1` run in AWS `ap-southeast-1`, the same region as Neon. Queries should take 1–2 ms. That figure is an estimate, to be measured after deploy.
- **Staging without a server.** Every Git branch gets a preview deployment. Pro includes one custom environment, used as the fixed UAT environment.
- **Instant Rollback** to the previous deployment.
- **Compliance.** Vercel is SOC 2 Type 2 and ISO 27001 certified ([pricing](https://vercel.com/pricing)).

What this choice costs us:

- A USD card is required.
- Pro has no uptime SLA. Vercel lists "platform SLAs" for Enterprise only.
- Billing above the $20 credit is uncapped unless Spend Management is set (see Setup).
- Functions cannot hold WebSockets. The live manager dashboard and the host screen refresh by polling every few seconds.
- In-memory state does not survive across function instances. `@fastify/rate-limit` with its default memory store does not limit anything. Use Vercel Firewall rate-limit rules instead (Pro includes 40 custom rules).
- Pro keeps runtime logs for 1 day. Reservation history lives in the audit log table, not in logs.

## Decision 3: Neon Launch for the database

Workload estimate for one outlet: the host tablet and the live dashboard keep the database awake during opening hours (10:00–22:00 WITA), and online bookings wake it at night. That is about 14 hours a day at 0.25 CU, or ~105 CU-hours a month. Always on is 180 CU-hours.

| Option | 105 CU-h/mo | 180 CU-h/mo | Restore | Idle behaviour |
|---|---|---|---|---|
| **Neon Launch** | ~Rp 188.000 | ~Rp 319.000 | Point-in-time, any second in the last 7 days | Sleeps after 5 min. Wakes in a few hundred ms |
| Supabase Pro | Rp 412.500 | Rp 412.500 | One daily backup, kept 7 days. Point-in-time is +$100/mo | Always on |
| Helipod Database Starter | ~Rp 250.000 | ~Rp 428.000 | None documented | Sleeps. Suspended when prepaid credits run out |
| Free tiers (Neon, Helipod, Supabase) | About at the limit | Over the limit | Short or none | Suspended or paused at the limit |

Neon wins on three points:

- **Recovery.** If a host deletes a day's reservations at 19:00, Neon restores the database to 18:59. Supabase Pro goes back only to last night's backup, which loses up to a day of bookings, unless GIOI pays $100 a month more.
- **Price.** Neon is the cheapest per hour of compute, at $0.106 per CU-hour ([Neon pricing](https://neon.com/pricing)). Supabase is cheaper only if the database runs nonstop above about 1 CU.
- **Staging.** Neon's Vercel integration creates a database branch for each preview deployment.

Supabase does have a Singapore region (`ap-southeast-1`). Its strengths are a flat bill, no wake delay, and Realtime push. Realtime would replace polling, but using it from the browser makes Row Level Security the only guard on guest data. The API owns every query in this design, so Supabase would be a more expensive Postgres.

What this choice costs us:

- A USD card is required. Neon bills monthly in arrears.
- The endpoint is public. IP allow rules need the Neon Scale plan. Guards are TLS with `sslmode=verify-full`, a connection string stored only as a Vercel secret, and an app role without superuser rights.
- The data sits in Singapore, not Indonesia. Under UU PDP, moving personal data abroad needs a legal basis (open item 2).
- The first request after a quiet period waits for the function to start and the database to wake: up to about 1 second, once. That figure is an estimate.

## Decision 4: Two layers of backups

1. Neon point-in-time restore covers mistakes in the last 7 days.
2. A daily `pg_dump` to Cloudflare R2 at 03:00 WITA, kept 30 days, gives GIOI a copy outside Neon. The quotation promises daily automated backups. A scheduled GitHub Actions workflow runs it, because Vercel functions cannot run `pg_dump`.

A restore test runs every month.

## Decision 5: Domains stay at Rumahweb

`gioigroup.com` is registered at CV. Rumahweb Indonesia (expires 2027-09-20). Its DNS and the company email are on Rumahweb too: `MX 0 gioigroup.com`.

- `book.gioigroup.com` and `admin.gioigroup.com` are two domains on the same Vercel web app project. Each gets a `CNAME` at Rumahweb pointing to the value Vercel shows when the domain is added. No nameserver change is needed.
- Guests book on `book.gioigroup.com/<venue>`, for example `book.gioigroup.com/bali`. A new outlet is a new path, not a new DNS record.
- Hosts and admins use `admin.gioigroup.com`. The venues a person sees come from their account (`user → venue_ids`). A Bali host account opens straight into Bali, and only group admins get a venue switcher. One login covers every outlet a person manages.
- `gioigroup.com/bali` gets a 301 redirect to `book.gioigroup.com/bali`, placed in `.htaccess` on the Rumahweb hosting.
- Guest pages and staff screens are on separate origins. Guest pages will carry marketing scripts (analytics, ad pixels), and the group site loads a script from `cdn.tailwindcss.com`. On the same origin, a compromised script could call the admin API with a logged-in host's cookies. Staff session cookies are set host-only on `admin.gioigroup.com`, never on `.gioigroup.com`.
- Each host serves only its own routes. A Nitro server middleware returns 404 for the staff routes (`/login`, `/host`, `/guests`, `/admin`) on `book.`, and for guest pages on `admin.`. The staff screens are client-rendered, so the API is the real guard: Fastify checks the session's `venue_ids` on every staff request.

One subdomain per outlet (`bali.gioigroup.com`, `jakarta.gioigroup.com`) was rejected. Every outlet shares one API and one database, so per-outlet origins do not separate outlet data. The `venue_ids` check in the API does that either way. Per-outlet origins would add a CNAME, a Vercel domain and a CORS entry per outlet, need a host-based rewrite for each prerendered landing page, and make group managers log in once per outlet.

Moving DNS to Cloudflare is not needed. Vercel provides the CDN, and Vercel accepts an apex domain through an `A` record at any DNS host.

Backlinks for the SEO deliverable point to `www.gioigroup.com/bali`, the canonical landing page of each venue (`www.gioigroup.com/<venue>`). The booking form lives at `book.gioigroup.com/<venue>/book`, and `book.gioigroup.com/<venue>` canonicalizes to the `www` page. The phase 1 redirect from `gioigroup.com/bali` to `book.gioigroup.com/bali` conflicts with a canonical on `www`, so it must be replaced by a page served on `www` before the canonical goes live. Bali is the only venue for now.

## Decision 6: Group readiness in the data model only

Every table that belongs to an outlet carries `venue_id` from the first migration: reservations, seating areas, booking rules and users. A second outlet is new rows on the same deployment.

Each venue also stores its IANA time zone (`Asia/Makassar` for Bali, `Asia/Jakarta` for Jakarta). Store timestamps in UTC. Compute slots, opening hours and "today" in the venue's zone. Bali (WITA, UTC+8) and Jakarta (WIB, UTC+7) differ by one hour, so a single server-wide zone would book Jakarta guests an hour off.

Nothing else is built for other outlets until one signs.

## Rollout phases

| Phase | What ships | Infrastructure change | Added monthly cost |
|---|---|---|---|
| 1. GIOI Bali | Landing page, booking flow, host and admin app, manager dashboard | Vercel project for the web app and one for the API, Neon, R2, `book` and `admin` CNAMEs at Rumahweb | ~Rp 575.000–720.000 total |
| 2. gioigroup.com | Static Astro group site with a page for each outlet | A third Vercel project on the apex domain through an `A` record at Rumahweb. Move the MX record first (steps in `gioi_group_site_change_request.md`) | ~Rp 0. Usage stays inside the $20 credit (estimate) |
| 3. Other outlets | Venue rows, staff accounts, a prerendered `/<venue>` landing page, an outlet page on the group site | None. New outlets are new paths on `book.gioigroup.com` | Neon CU-hours grow a little while outlets share opening hours |

In phase 2, Vercel rewrites can serve `gioigroup.com/bali` from `book.gioigroup.com/bali` as a real page instead of a redirect. The booking flow stays on `book.gioigroup.com`, and the host and admin screens stay on `admin.gioigroup.com`.

## Setup

The setup steps, the post-deploy checks and the security checklist are in `gioi_hosting_recommendation.md`.

## Costs

| Item | Monthly |
|---|---|
| Vercel Pro, 1 developer seat ($20, $20 usage credit included) | ~Rp 330.000 |
| Vercel usage above the credit | ~Rp 0 at restaurant traffic (estimate) |
| Neon Launch | ~Rp 188.000–319.000 |
| PPN, if charged on both (~11%) | ~Rp 57.000–71.000 |
| Cloudflare R2 backups | ~Rp 0 (free tier) |
| UptimeRobot | Rp 0 |
| **Total** | **~Rp 575.000–720.000** |

Rate used: Rp 16.500/USD. Vercel prices exclude VAT. Viewer seats for the GIOI team are free on Pro.

## Risks

| Risk | Effect | Guard |
|---|---|---|
| Functions left in `iad1` | Each query crosses the Pacific. Bookings slow down by a second or more | `regions: ["sin1"]` in both projects. Check the deployment summary after the first deploy |
| Vercel Spend Management pauses production | Site returns 503 until resumed by hand | Pause Production Deployments turned off. Alerts only |
| Neon usage above the estimate | Higher bill | Autoscaling ceiling at 1 CU. Spending alert at $25 |
| Wake delay on the first booking after a quiet period | One request takes up to ~1 s | Accept it. Turn off scale to zero if it matters (~Rp 319.000 a month) |
| GSAP hides the hero until JavaScript runs | Slow LCP on mobile data, weaker Core Web Vitals | Hero visible in the HTML. Animate from the visible state |
| A data residency requirement appears | Singapore no longer allowed | Postgres in Jakarta on a VPS, with backups owned by us |
| The domain lapses at Rumahweb | Website, booking, staff screens and email all go down | Auto-renew before 2027-09-20 |
| Root DNS changed in phase 2 without moving MX | Company email stops | Steps in `gioi_group_site_change_request.md` |

## Open items

1. **A USD card** for Vercel and Neon. Both require one. There is no IDR fallback in this stack.
2. **Data residency.** Ask GIOI whether guest data must stay in Indonesia. If yes, the database moves to Jakarta, and this record changes.
3. ~~**Booking domain style.**~~ Decided 2026-11-07: `book.gioigroup.com/<venue>` for guests and `admin.gioigroup.com` for staff (Decision 5).
4. **Access to the Rumahweb account** for the `book` and `admin` CNAMEs, the `/bali` redirect and the domain renewal.
5. **Language.** English only, or English and Indonesian.
6. **PPN on invoices.** Confirm whether Vercel and Neon add Indonesian VAT, and update the cost table.

## Sources

- Vercel: [pricing](https://vercel.com/pricing), [fair use and commercial usage](https://vercel.com/docs/limits/fair-use-guidelines), [function regions](https://vercel.com/docs/functions/configuring-functions/region), [regions list](https://vercel.com/docs/regions), [Spend Management](https://vercel.com/docs/spend-management), [Fastify support](https://vercel.com/changelog/zero-configuration-support-for-fastify), [preview deployments and indexing](https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines)
- Neon: [pricing](https://neon.com/pricing), [regions](https://neon.com/docs/introduction/regions.md), [Vercel integration](https://neon.com/docs/guides/vercel-overview)
- Supabase: [pricing](https://supabase.com/pricing), [regions](https://supabase.com/docs/guides/platform/regions)
- Helipod: [Next.js hosting](https://helipod.io/en/hosting-nextjs), [billing](https://docs.helipod.io/docs/helipod/billing), [bundle](https://docs.helipod.io/docs/container-api/bundle), [database plans](https://docs.helipod.io/docs/database-api/plans-and-scaling)
- `gioigroup.com` facts come from DNS, HTTP and WHOIS checks on 2026-11-07: Rumahweb nameservers and registrar, LiteSpeed, `MX 0 gioigroup.com`.
