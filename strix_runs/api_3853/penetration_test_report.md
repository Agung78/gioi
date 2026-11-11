# Security Penetration Test Report

**Generated:** 2026-11-11 06:34:03 UTC

# Executive Summary

The diff-scoped review identified **one confirmed medium-severity issue**: the deployed Nuxt service exposes unauthenticated Vite/Nuxt development endpoints that return transformed application source, HMR code, inline source maps, and absolute local paths. This materially aids attackers in understanding server, client, routing, and configuration logic.

No confirmed SQL injection, authorization bypass, cross-venue IDOR, CSV formula-injection bypass, SSRF, open redirect, dependency, or API data-disclosure issue was demonstrated in the reviewed changes. Several candidates remain proof gaps because authenticated seeded sessions or a web runtime connected to the modified API dataset were unavailable; these are not treated as confirmed vulnerabilities.

# Methodology

Performed a **diff-scoped white-box and black-box assessment** of the changed API and web files against the supplied merge-base scope. Source review covered Fastify route handlers, Prisma queries and migrations, Nuxt middleware/pages/components/composables, proxy and SEO routes, configuration, and generated models. Dynamic validation exercised the live API and web services for authentication boundaries, venue routing, injection behavior, CORS, export handling, public reservation flows, proxy normalization, and Vite/Nuxt development endpoints. Testing followed OWASP WSTG/PTES principles and excluded `/ingest/**` as instructed. Findings were reported only when a concrete unauthorized consequence was demonstrated.

# Technical Analysis

**Confirmed finding**

- **Medium — Unauthenticated Nuxt/Vite source disclosure (`vuln-0001`)**: unauthenticated requests to `/_nuxt/@fs/.../nuxt.config.ts`, `app.vue`, other application modules, and `/_nuxt/@vite/client` returned source and HMR content. The changed `nuxt.config.ts` externally binds the development server through `NUXT_DEV_HOST`; the live service is running in development mode. Vite blocks paths outside its allow-list, but that does not protect application source within the allowed workspace. Remediation is to deploy built Nuxt output, never expose `nuxt dev`, bind development mode to loopback, and disable production devtools.

**Areas tested with no confirmed issue**

- API authentication and role/venue checks, public reservation and venue handlers, floor-plan routes, Prisma/raw query construction, CORS origin enforcement, CSV escaping, proxy route normalization, SEO routes, host routing, open redirects, and dependency/configuration surfaces.
- Injection probes were handled as values; protected API routes returned authentication failures; fixed upstream proxy destinations did not permit SSRF or path traversal.

**Open proof gaps**

- Authenticated cancellation/export/feedback and host-versus-venue-admin checks could not be exercised without seeded credentials.
- Stored XSS candidates were traced from venue fields to JSON-LD `innerHTML` and `mapsUrl` links, and arbitrary API values were accepted, but end-to-end browser execution against the same modified dataset was unavailable. They remain follow-up items rather than findings.

No validated attack chain increased the impact of the confirmed source-disclosure issue.

# Recommendations

**Immediate**

- Stop exposing the Nuxt development server. Deploy with `nuxt build` and the generated production server, and ensure the externally reachable service is not `nuxt dev`.
- Remove externally controllable development binding and keep development listeners on loopback. Disable Nuxt DevTools and block `/_nuxt/@fs/`, `/_nuxt/@vite/`, HMR, and source-map development routes at the deployment boundary.

**Short-term**

- Add regression checks that unauthenticated requests to Vite filesystem/HMR endpoints return `404` or are unreachable in production.
- Re-test the open authenticated flows with disposable seeded accounts: cross-venue staff authorization, reservation-code cancellation/rate limiting, feedback transitions, and both CSV export routes with formula payloads.
- Run a browser-backed regression using a venue record written through the API to confirm whether JSON-LD script serialization and `mapsUrl` rendering execute attacker-controlled content; if confirmed, escape JSON-LD delimiters and enforce `https`/`http` URL schemes at the API and rendering boundaries.

**Validation**

- Reassess the live deployment after switching to production mode, confirming source, HMR, and absolute-path responses are no longer available and that ordinary public booking and administrative flows remain functional.

