# How to set up hosting for GIOI Bali

**Date:** 2026-11-07
**Stack:** Nuxt web app and Fastify API on Vercel Pro (`sin1`), Neon Launch Postgres (`aws-ap-southeast-1`), encrypted daily backups to Cloudflare R2, UptimeRobot.

This guide lists the setup steps in order. The reasons, the alternatives, the costs and the open items are in `gioi_infrastructure_decision.md`. Answer open items 1–2 there before step 1: a USD card and data residency.

## Before you start

You need these accounts:

- GitHub, with the code in a private repository.
- Vercel Pro, with one developer seat. The GIOI team can join as free viewers.
- Neon, on the Launch plan.
- Cloudflare, for R2 only. DNS stays at Rumahweb.
- UptimeRobot (free).
- Access to GIOI's Rumahweb account.

Turn on MFA for every account in this list.

## 1. Create the database

1. Create a Neon project in `aws-ap-southeast-1` (Singapore). A Neon project's region cannot be changed later.
2. Set the autoscaling ceiling to 1 CU. Keep scale to zero on (5 minutes).
3. Set a spending notification at USD 25 a month.
4. Create an app role for the API without superuser rights.
5. Write the first Prisma migration with `venue_id` and a venue time zone column. See Decision 6 in `gioi_infrastructure_decision.md`.

## 2. Deploy the API (Fastify)

1. Create a Vercel project for the API from the repository's API folder. Vercel detects Fastify with no configuration.
2. Pin its functions to Singapore in `vercel.json`. Vercel runs new projects in `iad1` (Washington, D.C.) by default, and every query to Neon would then cross the Pacific.

	```json
	{ "regions": ["sin1"] }
	```

3. Set `DATABASE_URL` to the Neon **pooled** connection string with `sslmode=verify-full`, as a secret environment variable.
4. Run `prisma migrate deploy` in the build step.
5. Add a `/health` route.

Build the API with these rules:

- Keep each request to a few database round trips: one transaction per booking, and no query per row.
- Hash passwords with argon2 through a prebuilt package such as `@node-rs/argon2`, so no native compile step runs on Vercel.
- Set session cookies to `httpOnly`, `Secure` and `SameSite=Lax`.
- Do not rely on `@fastify/rate-limit` with its memory store. Each function instance keeps its own counter, so it limits nothing. Use Vercel Firewall rate-limit rules (step 6).
- Validate every request with Fastify JSON Schema.

## 3. Deploy the web app (Nuxt)

1. Create a second Vercel project from the web app's folder.
2. Pin its functions to Singapore and proxy the API through the web app's domain, so the browser sees one origin and cookies need no CORS:

	```json
	{
		"regions": ["sin1"],
		"rewrites": [
			{ "source": "/api/:path*", "destination": "https://<api-project-domain>/:path*" }
		]
	}
	```

3. Prerender each venue's landing page and render the other screens in the browser. Guest pages are served on `book.gioigroup.com`, staff screens on `admin.gioigroup.com` (Decision 5 in the decision record):

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

4. Make the landing page fast on mobile data:
	- Keep the headline and the hero photo visible in the prerendered HTML. Let GSAP animate from that visible state, or start after the page loads. An element hidden until JavaScript runs delays LCP.
	- Build WebP or AVIF images at fixed sizes during the build. Preload the hero photo. Set `width` and `height` on every image.
	- Keep the existing `prefers-reduced-motion` handling.
5. Refresh the live manager dashboard and the host screen by polling every few seconds. Vercel functions cannot hold WebSockets.

## 4. Connect Neon to Vercel

1. Install the **Neon-Managed** Vercel integration on both projects. Each preview deployment then gets its own Neon branch, and the branch is deleted when its Git branch is deleted.
2. Create one Vercel custom environment named `staging` for UAT with the GIOI team. Give it its own Neon branch.

## 5. Add the domain

1. Add `book.gioigroup.com` and `admin.gioigroup.com` to the web app project in Vercel.
2. At Rumahweb, create the two `CNAME` records that Vercel shows. Do not change the nameservers.
3. Redirect the production `*.vercel.app` address to the custom domain.
4. Add the `gioigroup.com/bali` redirect to `.htaccess` on the Rumahweb hosting:

	```apache
	RewriteRule ^bali(/.*)?$ https://book.gioigroup.com/bali$1 [R=301,L]
	```

5. Turn on auto-renew for `gioigroup.com` at Rumahweb. It expires on 2027-09-20.

## 6. Protect the budget and the booking form

1. In Vercel **Settings → Billing → Spend Management**, set an On-Demand Budget of $20. That budget counts only usage above the $20 included credit. Notifications arrive at 50%, 75% and 100%.
2. Turn **off** **Pause Production Deployments**. When this switch is on, Vercel pauses production at the budget, and guests see `503 DEPLOYMENT_PAUSED` until each project is resumed by hand.
3. Add a Vercel Firewall rate-limit rule on the booking and login routes.
4. Add Cloudflare Turnstile to the public booking form.

## 7. Set up the daily backup

1. Create the R2 bucket `gioi-backups` (Standard storage class, location hint Asia-Pacific).
2. Create an R2 API token with **Object Read & Write** on `gioi-backups` only.
3. Add a lifecycle rule that deletes objects after 30 days.
4. Create an `age` key pair on your laptop. Store the private key offline, in a password manager and on a USB drive. Only the public key goes into the workflow.
5. Add these GitHub Actions secrets: `DATABASE_URL_DIRECT` (the Neon direct, unpooled connection string), `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `R2_ENDPOINT` and `AGE_PUBLIC_KEY`.
6. Add a workflow on schedule `0 19 * * *` (03:00 WITA), with Postgres 17 client tools and `age`. It runs with `set -o pipefail`, so a failed `pg_dump` fails the job instead of uploading an empty file:

	```bash
	set -o pipefail
	pg_dump "$DATABASE_URL_DIRECT" -Fc \
		| age -r "$AGE_PUBLIC_KEY" \
		| aws s3 cp - "s3://gioi-backups/gioi-$(date +%F).dump.age" --endpoint-url "$R2_ENDPOINT"
	```

7. Run the workflow once by hand and confirm that the file appears in the bucket.

`pg_dump` uses the direct connection string because it does not work reliably through the pooler. The dumps are encrypted because they hold guest PII. A leaked R2 token then yields only encrypted files. GitHub emails the person who last edited the schedule when a scheduled run fails.

## 8. Set up monitoring

1. Add an UptimeRobot monitor on `https://<booking-domain>/api/health`, every 5 minutes.
2. Send its alerts to the developer and to one person at GIOI.

## 9. Finish the SEO work

1. Add `Restaurant` structured data (JSON-LD) to the landing page: name, address, geo coordinates, opening hours, cuisines (Indonesian, Asian, Balinese, Western), price range, phone, and `acceptsReservations` plus a `ReserveAction` whose target is the booking form, `https://book.gioigroup.com/<venue>/book`. Add the venue's Instagram profile to `sameAs`.
2. Set titles, descriptions and Open Graph tags with `useSeoMeta`, so shared links show a preview on Instagram and WhatsApp.
3. Set one canonical URL for the landing page: `https://www.gioigroup.com/<venue>`. `book.gioigroup.com/<venue>` renders the same page and canonicalizes to it. Do not leave the `.htaccess` redirect from step 5.4 in place once the canonical points at `www`, because a canonical to a URL that redirects back is a loop. Vercel adds `X-Robots-Tag: noindex` to preview deployments automatically.
4. Publish `sitemap.xml` and `robots.txt` on `www.gioigroup.com`. List each venue's landing page. Keep the booking flow out of search with an `X-Robots-Tag: noindex` header (Nitro `routeRules` on `/<venue>/book`, `/<venue>/confirmation` and `/<venue>/feedback`), not a `robots.txt` Disallow. Google can only see a noindex on a page it may crawl. Serve `Disallow: /` on `admin.gioigroup.com`.
5. Submit the sitemap in Google Search Console.
6. Add `book.gioigroup.com/bali/book` as the booking link and `www.gioigroup.com/bali` as the website link on GIOI's Google Business Profile. Google requires a booking link to let the customer finish the booking, so it points at the form and not at the landing page. Google's link checker ignores `robots.txt` and only needs a 200 response.
7. Point SEO backlinks to `www.gioigroup.com/bali`, not to `book.gioigroup.com`.

## Check the setup after the first deploy

- The deployment summary of both Vercel projects shows `sin1`.
- `GET /api/health` answers 200 on the custom domain.
- A preview deployment answers with `X-Robots-Tag: noindex`.
- Lighthouse on the landing page, mobile profile, reports a good LCP.
- The first backup file is in R2, and it decrypts with the private key.
- A test booking appears on the host screen within one polling interval.

## Every month

1. Restore test: download the latest `.dump.age` file, decrypt it, create a temporary Neon branch, run `pg_restore` into it, compare the row counts of `reservations` and `guests` with production, and delete the branch.
2. Read the Neon CU-hours and the Vercel usage. After the first two weeks live, replace the estimate in the cost table of `gioi_infrastructure_decision.md`.
3. Review dependency updates and apply security patches.

## Security checklist

- [ ] Database: `sslmode=verify-full`, connection strings stored only as secrets, app role without superuser rights
- [ ] Guest pages on `book.gioigroup.com`, staff screens on `admin.gioigroup.com`. Staff cookies host-only on `admin.`. Each host returns 404 for the other's routes
- [ ] Passwords hashed with argon2. `httpOnly`, `Secure`, `SameSite=Lax` session cookies. Role checks (host, admin, super admin)
- [ ] Booking capacity enforced in a DB transaction plus a constraint
- [ ] Vercel Firewall rate limits and Cloudflare Turnstile on the public booking form
- [ ] Request validation with Fastify JSON Schema
- [ ] Audit log table (already required by the scope docs)
- [ ] Backups encrypted with `age`. The private key kept offline
- [ ] MFA on GitHub, Vercel, Neon, Cloudflare and Rumahweb
- [ ] Guest PII handled under UU PDP: consent and audit trail

## Not covered by hosting

Budget messaging separately: a WhatsApp provider plus Meta per-message fees, and an email provider. Pass these through to GIOI or include them in the retainer.
