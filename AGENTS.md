# Agent notes

## XERJ (code search)

This project uses XERJ for reference coding. Before writing code that touches
unfamiliar territory: `xerj def "<symbol>"` for go-to-definition, or
`xerj search --prefix gioi "<plain words>"` for ranked, definition-first passages.
Index a repo with `xerj autoindex <folder>`. Cite file:line for anything you rely on.

## Prototype vs production

`prototype/` is a frontend-only, single-venue demo (Vite + Vue Router + Pinia on localStorage). The production app is a new Nuxt web app plus a Fastify API, specified in `docs/ops/gioi_infrastructure_decision.md` and `docs/ops/gioi_hosting_recommendation.md`. When docs and prototype disagree, the docs win. Do not edit `prototype/` to match production: `scripts/record-demo.mjs` and `docs/RECORDING-SCENARIOS.md` depend on its current routes.

Reuse from the prototype as a reference:

- `src/views/` and `src/components/`: screen layout, copy, Tailwind styling, interactions.
- `src/domain/` (availability, status transitions, analytics, feedback) and its Vitest tests: business rules. Port them into the API, adapted to the rules below.
- `tailwind.config.js` and `src/style.css`: design tokens.

Do not copy these prototype patterns into production:

| Prototype | Production |
|---|---|
| Routes `/`, `/book`, `/confirmation/:code`, `/feedback/:code` | `book.gioigroup.com/<venue>`, `/<venue>/book`, `/<venue>/confirmation/:code`, `/<venue>/feedback/:code` |
| Staff routes `/login`, `/host`, `/guests/:id`, `/admin/*` on the same origin as guests | Same paths, served only on `admin.gioigroup.com`. 404 on `book.` |
| Vue Router `router.ts` | Nuxt file-based pages (`pages/[venue]/...`, `pages/admin/...`) |
| One venue, no `venue_id` (`mock/settings.json`) | Every outlet-owned table has `venue_id`. Venue slug in the guest URL; staff venue from `user_venues` |
| Fake auth: `loginAs(role)`, user id in localStorage, `Role = SUPER_ADMIN \| HOST` | argon2 passwords, `httpOnly` `Secure` session cookie host-only on `admin.`, roles per venue in `user_venues` (host, admin) plus super admin |
| Pinia stores hold all data, persisted to localStorage, seeded from `mock/*.json` | Data lives in Neon Postgres behind the Fastify API. Pinia holds UI state only |
| Dates via `new Date()` in the device's time zone (`domain/dates.ts`) | Timestamps stored in UTC. Slots, opening hours and "today" computed in the venue's IANA zone (`Asia/Makassar`, `Asia/Jakarta`) |
| Availability checked in the browser | Capacity enforced in the API inside a DB transaction plus a constraint |
| Venue picked by whatever the screen shows | The API derives the venue: slug lookup for public endpoints, session `venue_ids` check for staff endpoints. Never trust a client-sent venue id |
