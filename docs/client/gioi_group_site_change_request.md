# Change Request: GIOI Group Website Revamp

**Related quotation:** Q-GIOI-2026-001 (GIOI Ocean Gourmet, Bali)
**Date:** 2026-11-07
**Status:** Draft for internal review. Fee and dates are not set yet.

## Why this is a change request

Q-GIOI-2026-001 covers only GIOI Ocean Gourmet, Bali. Its scope is a Bali landing page, a reservation flow, an internal reservation app, guest history, a manager dashboard, and data migration and launch. The `gioigroup.com` website is not in that scope. The quotation says scope changes after discovery are "quoted via change request before work begins". This document is that change request.

## Current state

- `gioigroup.com` is a static HTML site on Rumahweb shared hosting (LiteSpeed, `203.175.9.139`). DNS is on Rumahweb nameservers.
- The site loads Tailwind from `cdn.tailwindcss.com` at runtime.
- Company email for `@gioigroup.com` is delivered to the same server: `MX 0 gioigroup.com`.
- `gioigroup.com/bali` currently returns 404.

## Proposed scope

The pages below are a starting list. Discovery confirms the final list with the group.

- Group home page: the GIOI story since 2016 in Jakarta, the brand, and the list of outlets.
- One page for each outlet, starting with `/bali` for GIOI Ocean Gourmet. Each outlet page links to that outlet's booking page.
- Contact page.
- Basic SEO: page titles, descriptions, Open Graph images, a sitemap, and Google Search Console setup.
- Moving the site from Rumahweb hosting to a static build, without breaking company email.

## Out of scope

- Reservation features for outlets other than Bali. Each outlet needs its own quotation under the Q-GIOI-2026-001 appendix.
- Copywriting and photography. The group supplies text and photos.
- Online ordering, payments, and e-commerce.
- Moving company email to another provider.

## Technical approach

- Framework: Astro, built to static HTML. No server or database is needed for the group site.
- Hosting: a third project on the existing Vercel Pro team, next to the Bali web app and API. Static pages served from Vercel's CDN stay inside the $20 monthly usage credit at the group site's traffic (estimate). No new account or plan is needed.
- Domain: `gioigroup.com` and `www` point to Vercel through an `A` record and a `CNAME` at Rumahweb. The nameservers and the registration stay at Rumahweb.
- The `/bali` page on the group site replaces the phase 1 redirect from `gioigroup.com/bali` to `book.gioigroup.com/bali`. SEO backlinks already point to `gioigroup.com/bali`, so they keep their value. The booking flow stays on `book.gioigroup.com`, and the host and admin screens stay on `admin.gioigroup.com`.

Company email is delivered to the website's server today (`MX 0 gioigroup.com`). If the root `A` record moves first, email follows the website to Vercel and stops arriving. To switch without losing email, follow these steps in order:

1. Add `mail.gioigroup.com A 203.175.9.139`.
2. Change the MX record to `mail.gioigroup.com`.
3. Wait for the old MX record to expire, then send and receive a test email.
4. Move the root `A` record and `www` to Vercel.
5. Keep the Rumahweb hosting plan, because it still carries the email.

## Dependencies on the group

- Access to the Rumahweb account for DNS changes.
- Confirmation of who uses `@gioigroup.com` mailboxes today.
- Text, photos, and logos for the group and for each outlet.
- One person at the group who approves content.

## Schedule

Start after the Bali reservation platform goes live, so the Bali timeline in Q-GIOI-2026-001 does not change.

## Fee

To be set: a one-time build fee, and whether group-site content updates join the existing monthly fee or get their own.
