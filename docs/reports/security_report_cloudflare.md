# Security Audit Report: GIOI Applications

- **Target**: [\`gioi\`](file:///Users/heyrcg/Documents/Works/gioi) (Scoped to [\`apps/api\`](file:///Users/heyrcg/Documents/Works/gioi/apps/api) and [\`apps/web\`](file:///Users/heyrcg/Documents/Works/gioi/apps/web))
- **Source Reference**: \`839261285f99c2f92a74fbb6364680c2591c8024\` (Clean working tree on \`development\`)
- **Execution Policy**: Sandboxed source-and-local-only inspection; offline execution; dummy local data only.
- **Workflow / Skill**: [Cloudflare Security Audit Skill](https://raw.githubusercontent.com/cloudflare/security-audit-skill/refs/heads/main/skills/security-audit/SKILL.md)
- **Run Artifacts Root**: [\`run-1\`](file:///Users/heyrcg/security-audit-skill/gioi/run-1)

---

## Executive Summary & Security Posture

The **GIOI** application cluster (Fastify backend, Nuxt frontend, and shared domain package) was audited across all applicable attack classes and trust boundaries following the Cloudflare Security Audit methodology.

The overall security posture is **clean and defensible**:
- **0 Confirmed Application Vulnerabilities**: Complete source path tracing revealed 0 SQL injection, 0 XSS, 0 SSRF, 0 RCE, and 0 IDOR.
- **Strict Multi-Tenancy**: Enforced through compound foreign keys \`[id, venueId]\` in PostgreSQL via Prisma, and checked in \`requireVenueAccess\` middleware.
- **Session & Password Hygiene**: Argon2id password hashing, 128-bit CSPRNG session tokens hashed with SHA-256 in PostgreSQL, single-active-session revocation, and \`HttpOnly\`, \`Secure\`, \`SameSite=Lax\` host-only cookies.
- **Defense in Depth**: Zero \`v-html\` bindings, JSON-LD bracket escaping (\`\\u003c\`), CSV formula injection neutralization (\`'=\`), host-level routing isolation (\`book.\` vs \`admin.\`), and production security response headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Permissions-Policy).

---

## Audit Ledger & Coverage Summary

The audit generated and verified **12 deterministic coverage units** spanning the core entry surfaces and trust boundaries of \`apps/api\` and \`apps/web\`:

| Dimension | Count | Status |
|---|---|---|
| **Audited Coverage Units** | 12 | All verified against \`validate-coverage-ledger.cjs\` |
| **Covered Units (Clean)** | 9 | Fully established boundaries with zero vulnerabilities |
| **Candidate Units** | 3 | Evaluated through candidate verifiers (2 needs validation, 1 rejected) |
| **Blocked / Deferred** | 0 | 0 units unassigned or blocked |

---

## Confirmed Vulnerabilities

| Severity | Title | Affected Boundary | Impact |
|---|---|---|---|
| *None* | *0 confirmed vulnerabilities* | — | No reachable security boundary violations identified in source review. |

---

## Needs Validation Leads

These leads represent source-grounded boundary hypotheses where the decisive security control depends on deployment, infrastructure, or edge environment configuration not verifiable from local repository source alone. They carry no severity rating until independently confirmed.

### 1. In-Memory Login Rate Limiter on Serverless Compute
- **Fingerprint**: \`auth.serverless_login_rate_limit_bypass\`
- **File & Location**: [auth.ts:24](file:///Users/heyrcg/Documents/Works/gioi/apps/api/src/routes/staff/auth.ts#L24) -> [loginLimit.ts:8](file:///Users/heyrcg/Documents/Works/gioi/apps/api/src/lib/loginLimit.ts#L8)
- **Claimed Root Cause**: \`assertLoginAllowed\` uses an in-process \`Map\` (\`fails\`) rather than a shared distributed cache (Redis/database).
- **Exact Blocker**: On Vercel Serverless Functions, isolated lambda instances and cold-start recycling do not share memory. Whether an edge WAF (e.g. Cloudflare Rate Limiting or Vercel Attack Challenge Mode) is configured in front of \`/staff/login\` is not observable from repository source.
- **Local Validation Plan**: Run two Fastify processes on different ports behind a round-robin proxy fixture, send 10 failed login requests interleaved between them, and observe that neither instance accumulates 10 failures.
- **Deployment Check**: Operator verifies Cloudflare WAF or Vercel firewall rules for \`/staff/login\`. If unthrottled, migrate \`loginLimit.ts\` to an atomic Redis counter (Upstash) or a dedicated database table.

### 2. Public Reservation Capacity Exhaustion via Direct API Access
- **Fingerprint**: \`availability.public_reservation_honeypot_dos\`
- **File & Location**: [reservations.ts:78](file:///Users/heyrcg/Documents/Works/gioi/apps/api/src/routes/public/reservations.ts#L78) -> [reservations.ts:158](file:///Users/heyrcg/Documents/Works/gioi/apps/api/src/routes/public/reservations.ts#L158)
- **Claimed Root Cause**: Cloudflare Turnstile token verification was replaced by an invisible honeypot field (\`body.website\`), with no per-IP or per-phone request velocity limiting on public booking creation.
- **Exact Blocker**: Automated clients sending HTTP requests directly to \`/public/venues/:slug/reservations\` omitting the \`website\` field can programmatically create reservations up to venue capacity limits without solving proof-of-work or CAPTCHA challenges. Whether Cloudflare Bot Management or Turnstile managed challenge is enforced at the edge on \`book.gioigroup.com\` is not observable from repository source.
- **Local Validation Plan**: Run a local script issuing 20 reservation requests with generated phone numbers omitting the \`website\` field, verifying reservations are created until capacity is filled.
- **Deployment Check**: Operator checks Cloudflare dashboard for \`book.gioigroup.com\` to confirm whether Bot Fight Mode or Turnstile Managed Challenge is active on \`POST /api/public/venues/*/reservations\`.

---

## Evaluated & Refuted Claims (Rejected)

### Nuxt 3.21.11 Route-Rules Case-Sensitivity Advisory
- **Fingerprint**: \`web.nuxt_routerules_case_sensitivity\`
- **File & Location**: [nuxt.config.ts:38](file:///Users/heyrcg/Documents/Works/gioi/apps/web/nuxt.config.ts#L38) -> [auth.ts:3](file:///Users/heyrcg/Documents/Works/gioi/apps/web/middleware/auth.ts#L3)
- **Claimed Root Cause**: Advisory CVE-2026-114132 allows case-sensitive route matching to bypass Nitro \`ssr: false\` rules (e.g. \`/Admin\`).
- **Refutation Reason**: Refuted by multi-layer defense-in-depth:
  1. [host-routes.ts:5](file:///Users/heyrcg/Documents/Works/gioi/apps/web/server/middleware/host-routes.ts#L5) uses a case-insensitive regex (\`const STAFF = /^\\/(login|host|guests|admin)(\\/|$)/i\`), ensuring \`/Admin\` returns 404 on the public booking host.
  2. SSR renders no authenticated data without client credentials.
  3. Client-side Nuxt router normalizes routes and enforces [auth.ts](file:///Users/heyrcg/Documents/Works/gioi/apps/web/middleware/auth.ts), bouncing unauthenticated users to \`/login\`.
  4. The Fastify API independently enforces \`requireAuth\` and \`requireVenueAccess\` on every staff endpoint.

---

## Standard Run Artifacts Generated

All structured audit artifacts have been generated in the designated output directory:
- [run-metadata.json](file:///Users/heyrcg/security-audit-skill/gioi/run-1/run-metadata.json)
- [architecture.md](file:///Users/heyrcg/security-audit-skill/gioi/run-1/architecture.md)
- [coverage-ledger.json](file:///Users/heyrcg/security-audit-skill/gioi/run-1/coverage-ledger.json) *(Validated: 12 units)*
- [findings.json](file:///Users/heyrcg/security-audit-skill/gioi/run-1/findings.json) *(Validated: 3 records)*
- [REPORT.md](file:///Users/heyrcg/security-audit-skill/gioi/run-1/REPORT.md)
- [FINDINGS-DETAIL.md](file:///Users/heyrcg/security-audit-skill/gioi/run-1/FINDINGS-DETAIL.md)
- [NEEDS-VALIDATION.md](file:///Users/heyrcg/security-audit-skill/gioi/run-1/NEEDS-VALIDATION.md)
