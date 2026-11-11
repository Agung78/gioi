---
title: Security Scan\n& Remediation Report
subtitle: apps/api (Fastify)  ·  apps/web (Nuxt)
meta: SAST · SCA · DAST · Pentest   |   2026-11-11   |   branch development
footer: GIOI · Security Scan & Remediation
---

## Executive summary

Both apps were rescanned on commit d748c33 with Semgrep (SAST), OSV.dev via cve-mcp-server (SCA), OWASP ZAP baseline (DAST, passive) and a Strix deep pentest (white-box + black-box) against the local dev servers. SAST found nothing in either app. The API has no advisories. The web app has three open nuxt advisories (fixed only in Nuxt 4) and no security response headers. Strix confirmed one Medium finding, source disclosure from the Nuxt dev server, which comes from the dev-mode scan target and not from the Vercel production build. Overall risk is low to moderate; no advisory is in CISA KEV and the highest EPSS is 0.00424.

::: stats
0 | SAST findings | green
3 | Advisories open (nuxt) | orange
0 | API advisories | blue
11 | Web DAST alerts (0 fail) | tan
1 | Pentest finding (Medium, dev-mode) | orange
:::

### Changes since 2026-11-08 scan

| Item | Then | Now |
|---|---|---|
| vitest (api, web) | 2.1.9 advisories | 4.1.12 installed, 0 advisories |
| happy-dom (web) | 15.11.7 advisories | 21.0.4 installed, 0 advisories |
| nuxt (web) | 3 advisories | 3.21.11, same 3 advisories still open |
| web DAST | 10 warnings | 10 warning rules, 14 alert entries (see below) |

#### Open: nuxt 3.21.11

Three advisories are fixed only in Nuxt 4 (≥ 4.6.0 / 4.6.2). An earlier Nuxt 4.6.4 attempt was reverted (`@pinia/nuxt` incompatibility, `/bali` prerender 500). Only CVE-2026-114132 (route rules skipped for case-variant paths) touches this app: `routeRules` in `nuxt.config.ts` set `ssr: false` on `/login`, `/host`, `/admin/**`, `/guests/**` and `X-Robots-Tag: noindex` on booking pages. The other two are inactive here (pages/ and vue-router in use; no `.server.vue` or `<NuxtIsland>`).

## Findings by layer

### SAST · Semgrep 1.181.0 (`--config=auto`)

| App | Rules | Files scanned | Findings |
|---|---|---|---|
| api | 389 | 65 | 0 |
| web | auto | 58 | 0 |

Web run reported 36 non-fatal "Internal matching error" engine warnings (rule/engine limitations, not findings).

### SCA · OSV.dev (installed versions from node_modules)

**api:** 14 packages (fastify 5.12.8, @prisma/client 7.10.1, @fastify/cookie 11.1.5, @fastify/cors 10.1.0, @node-rs/argon2 2.0.0, posthog-node 5.63.1, vitest 4.1.12, others). 0 advisories.

**web:** 21 packages, 3 advisories, all in `nuxt` 3.21.11 (production dependency).

| Package | Advisory | CVE | Severity | EPSS | KEV | Active in app |
|---|---|---|---|---|---|---|
| nuxt | GHSA-vjh5-4x84-xrqp | CVE-2026-114132 | Moderate (CVSS v4) | 0.00424 | no | Yes, routeRules bypass |
| nuxt | GHSA-jjm6-p2m9-9w4x | CVE-2026-114130 | Low (CVSS v4) | 0.00406 | no | No, pages/ enabled |
| nuxt | GHSA-xfq5-w38q-pc2x | CVE-2026-114133 | CVSS 3.1 vector only, no score | 0.00220 | no | No, no server islands |

### DAST · OWASP ZAP baseline (passive)

**API** (`http://host.docker.internal:3001`): 67 pass, 0 fail, 1 warn. Only alert: Storable and Cacheable Content [10049] on two 404 responses, informational. Spider reached only `/` and `/sitemap.xml` (both 404); `/health` (200) and all other routes were not exercised, and no OpenAPI spec is served, so coverage is partial.

**Web** (`http://host.docker.internal:3002`, Nuxt dev server): 58 pass, 10 warn, 0 fail, 70 URLs crawled. Risk levels as reported by ZAP:

| Alert | ID | Risk | Instances | Fix |
|---|---|---|---|---|
| Content Security Policy not set | 10038 | Medium | 5 | Content-Security-Policy via routeRules headers |
| Missing anti-clickjacking header | 10020 | Medium | 5 | X-Frame-Options or frame-ancestors |
| Cross-domain misconfiguration | 10098 | Medium | 5 | Review CORS on `_nuxt` assets |
| Absence of Anti-CSRF tokens | 10202 | Medium (low confidence) | 2 (`/bali`) | Review form; API uses cookies, check SameSite/CSRF |
| X-Content-Type-Options missing | 10021 | Low | 5 | `nosniff` |
| Permissions Policy not set | 10063 | Low | 5 | Add Permissions-Policy |
| COEP / COOP / CORP missing | 90004 | Low | 3 / 3 / 4 | Add headers |
| X-Powered-By disclosure | 10037 | Low | 5 | Disable in nitro config |
| Cacheable / non-cacheable content | 10049 | Info | 4 / 4 | Review cache headers |
| Modern web application | 10109 | Info | 5 | None |

`nuxt.config.ts` sets only `X-Robots-Tag`; no security headers exist in `routeRules` or `nitro`, so header alerts are real configuration gaps. Target was the dev server, so X-Powered-By and cache headers may differ in the Vercel production build. Sub Resource Integrity (90003), reported on 2026-11-08, did not fire this run.

### Pentest · Strix 1.3.0 (deep, diff-scoped, run `api_3853`)

White-box (api and web source mounted) plus black-box against `host.docker.internal:3001` and `:3002`; `/ingest/**` excluded. Web target was `nuxt dev` started with `--host 0.0.0.0`.

| ID | Severity | Endpoint | Status |
|---|---|---|---|
| vuln-0001 | Medium (CVSS 5.3) | `/_nuxt/@fs/.../nuxt.config.ts`, `app.vue`, `/_nuxt/@vite/client` | Dev-mode artifact. `nuxt.config.ts` binds the dev server to 127.0.0.1 unless `NUXT_DEV_HOST` is set; Vercel serves the production build. Production retest pending. |

Vite's allow-list blocked `/@fs/etc/passwd` and the API `.env` (403), so this is not arbitrary file read.

Retest of the 2026-11-10 Strix findings: credentialed reflected CORS and CSV formula injection did not reproduce. Strix tested CORS origin enforcement and CSV escaping with no issue; the fixes themselves were not reviewed here.

Tested, no confirmed issue: API auth and role/venue checks, Prisma raw queries, SSRF, open redirects, proxy path normalization, dependencies.

Open proof gaps (not confirmed vulnerabilities): authenticated cancel, export and feedback flows and host vs venue-admin checks (no seeded credentials); possible stored XSS via venue fields into JSON-LD `innerHTML` and `mapsUrl` links (no browser execution shown). Hardening applied after the scan: `PATCH /admin/venues/:id` rejects a `mapsUrl` that is not `http(s)://` (422), and JSON-LD output escapes `<` (`useVenueSeo.ts`). Neither change has been tested.

## Next steps

| # | Action | Why | Effort |
|---|---|---|---|
| 1 | Add security headers in nuxt.config.ts routeRules (CSP, X-Frame-Options, nosniff, Permissions-Policy, COEP/COOP/CORP); disable X-Powered-By | Clears most ZAP alerts | Small |
| 2 | Migrate web to Nuxt 4: bump @pinia/nuxt and pinia to 3.x, fix the /bali prerender, adopt the app/ source layout | Closes all 3 nuxt advisories, including the routeRules bypass | Medium |
| 3 | Until then, enforce auth on /admin, /host, /guests in middleware or API, not only routeRules | Case-variant path bypass of route rules | Small |
| 4 | Provide an OpenAPI spec or route list for the API and rerun ZAP (`zap-api-scan.py`) | Current DAST covers only the root path | Small |
| 5 | Wire Semgrep and an OSV scan into CI | Scans are ad hoc today | Small |
| 6 | Rerun Strix against `nuxt build` + `nuxt preview` with seeded credentials; confirm vuln-0001 clears and run the authenticated checks | Dev-mode artifact and unexercised authenticated flows | Small |
| 7 | Add regression tests for the `mapsUrl` http(s) check and JSON-LD `<` escaping | New hardening is untested | Small |

> Method and limits: versions read from installed node_modules. DAST is passive baseline against local dev servers (api :3001, web :3002). The Strix run was active but diff-scoped, non-destructive, and had no seeded credentials. Apart from the two hardening changes noted under Pentest, nothing in the repo was modified and no findings were suppressed. Raw outputs: /tmp/gioi-{api,web}-semgrep.json, /tmp/gioi-{api,web}-cve-mcp.json, /tmp/gioi-{api,web}-zap/zap-report.json, strix_runs/api_3853/. Scans were run by nemotron subagents; web Semgrep was rerun directly.
