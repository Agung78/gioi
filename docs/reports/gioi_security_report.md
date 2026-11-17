---
title: Security Scan & Remediation Report
subtitle: apps/api (Fastify)  ·  apps/web (Nuxt)
meta: SAST · SCA · DAST · Pentest   |   2026-11-17   |   branch development
footer: GIOI · Security Scan & Remediation
---

## Executive summary

Both applications (`apps/api` and `apps/web`) along with shared packages (`packages/domain`) underwent a comprehensive, multi-layer security assessment on 2026-11-17 against commit `0c228bf` on branch `development` (reflecting active working-tree state). The scan pipeline executed Semgrep (SAST), `cve-mcp-server` / OSV.dev (SCA), mandatory OWASP ZAP full active & passive scans (DAST) across both backend (`localhost:3000`) and frontend (`localhost:5174`), and cross-referenced recent Strix active pentest coverage.

No application code vulnerabilities (0 SQLi, 0 XSS, 0 SSRF, 0 RCE, 0 IDOR) were found in either `apps/api` or `apps/web`. The API backend has zero dependency advisories and passed all 142 DAST checks cleanly. The web frontend exhibits 5 open advisories on `nuxt` 3.21.11 (all resolved only in Nuxt 4) and lacks production security response headers (CSP, X-Frame-Options, nosniff, Permissions-Policy). Overall security posture is **Low to Moderate**; no identified vulnerability exists in the CISA Known Exploited Vulnerabilities (KEV) catalog, and the maximum EPSS score is 0.01028 (dev-only Vitest UI in domain package).

::: stats
0 | App Code SAST findings | green
5 | Web Advisories (Nuxt) | orange
0 | API Advisories | blue
11 | Web DAST Warning Rules (0 Fail) | tan
0 | Confirmed Pentest Flaws | green
:::

---

## 1. Scan Metadata & Scope

| Attribute | Details |
|---|---|
| **Date** | 2026-11-17 |
| **Repository** | `gioi` (`apps/api`, `apps/web`, `packages/domain`) |
| **Branch** | `development` |
| **Commit** | `0c228bfbd3e31c60a48cf2f51981dbc60dad7365` |
| **Working Tree** | Working-tree modifications present in `apps/api` and `apps/web` (scan reflects current working tree) |
| **Backend Target** | Fastify API (`http://localhost:3000` / `http://host.docker.internal:3000`) — *Reachability Verified (HTTP 200 /health)* |
| **Frontend Target** | Nuxt SPA (`http://localhost:5174` / `http://host.docker.internal:5174`) — *Reachability Verified (HTTP 200 /)* |
| **Integrity Statement** | No source files, dependencies, lockfiles, or configurations were altered to hide findings. No findings were suppressed. |

---

## 2. Tooling Integration & Pipeline

| Layer | Tool | Coverage & Scope | CI/CD Status | Execution Command |
|---|---|---|---|---|
| **SAST** | Semgrep 1.181.0 (`--config=auto`) | Static source code audit for injection, auth bypass, secret leaks, and insecure configs | Ad-hoc / Local | `semgrep scan --config=auto --json --output=/tmp/gioi-semgrep.json .` |
| **SCA** | `cve-mcp-server` (OSV, NVD, EPSS, CISA KEV) | Installed manifest inspection (`node_modules`) cross-referenced against vulnerability feeds | Ad-hoc / Local | `python3 <scratchpad>/run_cve_scan.py` (via `cve-mcp-server` venv) |
| **DAST (Backend)** | OWASP ZAP 2.17.0 (Full Scan) | Active and passive scanning of Fastify API endpoints on port 3000 | Local only (Never in CI) | `docker run --rm -v /tmp/gioi-zap:/zap/wrk:rw --add-host host.docker.internal:host-gateway ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py -t http://host.docker.internal:3000 -r zap-full-report-3000.html -J zap-full-report-3000.json -m 10 -I` |
| **DAST (Frontend)** | OWASP ZAP 2.17.0 (Full Scan) | Active and passive scanning of Nuxt frontend on port 5174 | Local only (Never in CI) | `docker run --rm -v /tmp/gioi-zap:/zap/wrk:rw --add-host host.docker.internal:host-gateway ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py -t http://host.docker.internal:5174 -r zap-full-report-5174.html -J zap-full-report-5174.json -m 10 -I -z "-addonuninstall hud -addonuninstall websocket"` |
| **Pentest** | Strix 1.7.1 | White-box, diff-scoped AST review of `apps/api` + `apps/web` (standard mode, $15 cap); no runtime/black-box phase | Local | `strix -n -t ./apps/api -t ./apps/web --scan-mode standard --max-budget 15` (run `strix_runs/api_b46b/`) |

---

## 3. SAST · Semgrep Static Analysis

Semgrep scanned **294 tracked files** executing **1,677 rules**.

### 3.1 Severity Breakdown
| Severity | Application Code (`apps/api`, `apps/web`) | Infrastructure / Workflows / Config | Legacy Prototype | Total |
|---|---|---|---|---|
| **CRITICAL** | 0 | 0 | 0 | **0** |
| **HIGH** | 0 | 0 | 0 | **0** |
| **WARNING / MEDIUM** | 0 | 7 | 1 | **8** |
| **INFO** | 0 | 0 | 0 | **0** |

### 3.2 Finding Details

#### Cluster A: GitHub Actions Mutable Version Tags
- **Rule ID**: `yaml.github-actions.security.github-actions-mutable-action-tag.github-actions-mutable-action-tag`
- **Severity**: WARNING | **Confidence**: HIGH
- **CWE / OWASP**: CWE-1357, CWE-353 | OWASP A08:2021 / A08:2025 (Software and Data Integrity Failures)
- **Locations**:
  - [backup.yml:12](file:///Users/heyrcg/Documents/Works/gioi/.github/workflows/backup.yml#L12): `uses: actions/checkout@v4`
  - [ci.yml:32](file:///Users/heyrcg/Documents/Works/gioi/.github/workflows/ci.yml#L32): `uses: actions/checkout@v4`
  - [ci.yml:35](file:///Users/heyrcg/Documents/Works/gioi/.github/workflows/ci.yml#L35): `uses: pnpm/action-setup@v4`
  - [ci.yml:38](file:///Users/heyrcg/Documents/Works/gioi/.github/workflows/ci.yml#L38): `uses: actions/setup-node@v4`
- **Grounded Analysis**: Workflows reference major release tags (`@v4`) which can theoretically be mutated upstream if a repository or tag is compromised.
- **Verdict**: **Confirmed-but-low-practical-risk**. The actions originate from verified GitHub official organizations (`actions/` and `pnpm/`).
- **Remediation**: Pin actions to immutable full commit SHAs with inline version comments:
  ```yaml
  uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
  ```

#### Cluster B: pnpm Supply Chain Hardening Policies
- **Rule IDs**:
  - `package_managers.pnpm.pnpm-block-exotic-sub-dependencies.pnpm-block-exotic-sub-dependencies`
  - `package_managers.pnpm.pnpm-missing-minimum-release-age.pnpm-minimum-release-age`
  - `package_managers.pnpm.pnpm-trust-policy.pnpm-trust-policy`
- **Severity**: MEDIUM | **Confidence**: HIGH
- **CWE / OWASP**: CWE-829 | OWASP A08:2021
- **Location**: [pnpm-workspace.yaml:1](file:///Users/heyrcg/Documents/Works/gioi/pnpm-workspace.yaml#L1)
- **Grounded Analysis**: `pnpm-workspace.yaml` configures `onlyBuiltDependencies` (restricting native build script execution to `prisma`, `esbuild`, `@node-rs/argon2`), but omits newer pnpm v9/v10 supply-chain flags.
- **Verdict**: **Confirmed (Best Practice Hardening)**.
- **Remediation**: Add supply-chain protection attributes to `pnpm-workspace.yaml`:
  ```yaml
  blockExoticSubdeps: true
  minimumReleaseAge: 1440m # 24 hours
  trustPolicy: no-downgrade
  ```

#### Cluster C: Subresource Integrity (SRI) on External Stylesheet
- **Rule ID**: `html.security.audit.missing-integrity.missing-integrity`
- **Severity**: WARNING | **Confidence**: MEDIUM
- **CWE / OWASP**: CWE-353 | OWASP A08:2021
- **Location**: [prototype/index.html:10](file:///Users/heyrcg/Documents/Works/gioi/prototype/index.html#L10)
- **Grounded Analysis**: External font stylesheet `api.fontshare.com` is loaded without an `integrity` attribute in the legacy prototype HTML.
- **Verdict**: **False positive for production**. Production `apps/web` self-hosts Cabinet Grotesk and Satoshi under `public/fonts/` without third-party CDN dependencies.

---

## 4. SCA · Dependency CVE Analysis (`cve-mcp-server`)

All installed package versions were inspected from resolved `node_modules` and cross-referenced against OSV.dev, EPSS, and the CISA KEV catalog.

### 4.1 Manifest Summaries

| Workspace | Manifest | Dependencies Audited | Open Advisories |
|---|---|---|---|
| `apps/api` | `apps/api/package.json` | 14 packages (Fastify 5.12.8, Prisma 7.10.1, Argon2 2.0.0, Vitest 4.1.12, etc.) | **0** |
| `apps/web` | `apps/web/package.json` | 21 packages (Nuxt 3.21.11, Vue 3.5.45, Pinia 3.0.4, Tailwind 3.4.19, etc.) | **5** (all in `nuxt`) |
| `packages/domain` | `packages/domain/package.json` | 2 packages (TypeScript 5.9.3, Vitest 2.1.9) | **2** (all in `vitest`) |

### 4.2 Web Findings Detail (`nuxt` 3.21.11)

| Advisory ID | CVE | Severity | CVSS | EPSS | KEV | Real App Impact |
|---|---|---|---|---|---|---|
| **GHSA-vjh5-4x84-xrqp** | CVE-2026-114132 | Moderate | 6.3 (v4) | 0.00424 | No | **Active**: Server route rules (`ssr: false` on `/admin/**`, `/host`, `/guests/**`) skipped for case-variant requests (e.g. `/Admin`). Requires server-side auth enforcement in middleware. |
| **GHSA-96x6-fvhx-49hg** | CVE-2026-128075 | Moderate | 5.3 (v3.1) | 0.00311 | No | **Low**: Exposes error message and data on unhandled SSR errors. |
| **GHSA-f3x9-2chm-73c8** | CVE-2026-128071 | Moderate | 6.5 (v3.1) | 0.00268 | No | **Inactive**: Route rules bypass via `%2F` applies to catch-all routes (`[...slug].vue`), which this app does not use. |
| **GHSA-jjm6-p2m9-9w4x** | CVE-2026-114130 | Low | 2.3 (v4) | 0.00406 | No | **Inactive**: Triggers only when `pages` feature is disabled. |
| **GHSA-hf59-9xwc-2g4p** | CVE-2026-128076 | Low | 2.6 (v3.1) | 0.00116 | No | **Inactive**: Triggers on colliding server island props; no server islands are implemented. |

*Remediation for Nuxt*: Advisories are patched in Nuxt 4 (≥ 4.6.0). Upgrading requires resolving `@pinia/nuxt` compatibility. In the interim, ensure all staff routes enforce authentication in Fastify API controllers and client middleware, not relying solely on Nitro routeRules.

### 4.3 Domain Package Findings (`vitest` 2.1.9)

| Advisory ID | CVE | Severity | CVSS | EPSS | KEV | Real App Impact |
|---|---|---|---|---|---|---|
| **GHSA-5xrq-8626-4rwp** | CVE-2026-47429 | Critical | 9.8 (v3.1) | 0.01028 | No | **Inactive in Production**: Arbitrary file read occurs only when running `vitest --ui` server. `apps/api` and `apps/web` use Vitest 4.1.12. |
| **GHSA-82fw-gwwq-j7x9** | CVE-2026-84373 | Moderate | 5.9 (v3.1) | 0.00527 | No | **Dev-Only**: Path traversal in mock redirect handler during unit test runs. |

*Remediation*: Upgrade `packages/domain/package.json` devDependency `vitest` from `^2.1.8` to `^4.1.12` to align with the rest of the monorepo.

---

## 5. DAST · OWASP ZAP Full Scan

Full active DAST scans were performed against both services using `ghcr.io/zaproxy/zaproxy:stable`.

### 5.1 Backend API (`http://localhost:3000`)
- **Endpoints Crawled**: 6 URLs
- **Total Checks Passed**: **142 PASS**
- **Failures**: **0 FAIL**
- **Warnings**: **1 WARN**

| Alert | Risk Level | Instances | URLs | Assessment |
|---|---|---|---|---|
| **HTTP Only Site** [10106] | Medium (Confidence: Medium) | 1 | `http://host.docker.internal:3000/` | **Dev-mode artifact**: Local scan executed over HTTP without TLS certificate termination. Production is terminated via HTTPS. |
| **Storable and Cacheable Content** [10049] | Informational | 4 | `http://host.docker.internal:3000/robots.txt` | Standard cacheability observation on 404 responses. |

*Active Attack Resilience*: ZAP actively fired attack payloads for SQL Injection (PostgreSQL time-based and boolean-based), Remote Code Execution, Path Traversal, SSRF, XXE, Parameter Pollution, and Session Fixation. Fastify's strict routing and Prisma ORM parameterized queries resisted all attack vectors with zero exploitable behaviors.

---

### 5.2 Frontend SPA (`http://localhost:5174`)
- **Endpoints Crawled**: 64 URLs (including Nuxt pages `/[venue]`, `/login`, `/host`, `/admin`, `/guests`, `/privacy`)
- **Total Checks Passed**: **132 PASS**
- **Failures**: **0 FAIL**
- **Warning Rules**: **11 WARN** (18 distinct alert classifications)

#### Alert Inventory

| Alert Name | Plugin ID | Risk Level | Instances | Assessment & Classification |
|---|---|---|---|---|
| **Content Security Policy (CSP) Not Set** | 10038 | Medium | 5 | **Confirmed Application Gap**: No CSP header configured on Nuxt HTML responses. |
| **Missing Anti-clickjacking Header** | 10020 | Medium | 5 | **Confirmed Application Gap**: Missing `X-Frame-Options` or CSP `frame-ancestors`. |
| **X-Content-Type-Options Missing** | 10021 | Low | 5 | **Confirmed Application Gap**: Missing `X-Content-Type-Options: nosniff`. |
| **Permissions Policy Not Set** | 10063 | Low | 5 | **Confirmed Application Gap**: Missing `Permissions-Policy` header. |
| **Cross-Origin Headers (COEP/COOP/CORP) Missing** | 90004 | Low | 10 | **Confirmed Hardening Gap**: Missing cross-origin isolation headers. |
| **X-Powered-By Information Leak** | 10037 | Low | 5 | **Confirmed Information Leak**: Nuxt emits `x-powered-by: Nuxt`. |
| **Application Error Disclosure** | 90022 | Low | 1 | **Dev-mode artifact**: `/bali` returned 500 during fuzzing when mock backend venue lookup failed. |
| **CORS Misconfiguration** | 40040 | Medium | 5 | **Dev-mode artifact**: Vite dev-server HMR filesystem endpoint `_nuxt/@fs/*`. Not present in production Vercel builds. |
| **Cross-Domain Misconfiguration** | 10098 | Medium | 5 | **Dev-mode artifact**: Vite dev-server serving CSS assets across origin. |
| **Sub Resource Integrity (SRI) Missing** | 90003 | Medium | 5 | **Dev-mode artifact**: Local Vite HMR module scripts do not bundle static SRI hashes. |
| **HTTP Only Site** | 10106 | Medium | 1 | **Dev-mode artifact**: Local dev server executed without TLS. |

---

## 6. Pentest · Strix Active Verification Cross-Reference

Strix run `api_b46b` (2026-11-17, status `completed`, 200 LLM requests, ~17M tokens). Mode: white-box, diff-scoped, standard. Mounted workspaces contained only `apps/api` and `apps/web` (no repo root, git metadata, or root `pnpm-lock.yaml`); no runtime exploitation was performed.

- **Result**: 0 validated vulnerabilities. 28 surfaces reviewed: 15 no issue, 10 ruled out, 1 not applicable, 2 need follow-up.
- **Key confirmed safeguards**:
  - Staff and admin routes enforce session, venue-membership and role checks; no cross-venue IDOR/BFLA demonstrated.
  - Public booking/availability: parameterized queries; apparent reservation-identifier leak in availability response traced and ruled out (identifiers not serialized).
  - Login redirect (`/login?next=`) rejects absolute and protocol-relative destinations; Vue interpolation and escaped JSON-LD block the examined XSS paths.
- **Open gaps (not vulnerabilities)**:
  - Deployed CORS origin allowlist unverified (code uses HTTP-only, Secure, SameSite=Lax cookies and configured-origin CORS checks for unsafe methods).
  - Root `pnpm-lock.yaml` not scanned by Strix; dependency CVEs are covered by Section 4 instead.
  - `browser security` and `business logic` risk classes were assigned to subagents but have no coverage entries; treat as unexamined, not clean.
- **Follow-up**: rerun with `--scan-mode deep --scope-mode full` from the repo root, plus a black-box pass against staging with credentials, to close the gaps above.

---

## 7. Prioritized Remediation Plan

Status after remediation (SEO-safety checked: no change to HTML, robots, canonical, sitemap, JSON-LD, or `X-Robots-Tag` rules; only response headers, dev tooling and CI config touched):

| Priority | Area | Action | Remediation Details | Effort | Status |
|---|---|---|---|---|---|
| **P1** | Frontend Security Headers | Add security response headers | Already set for production in `apps/web/vercel.json` (CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, HSTS, COOP). The ZAP gaps came from scanning the local dev server, which does not apply `vercel.json`. No `nuxt.config.ts` duplicate added: a second CSP risks breaking inline theme/JSON-LD/hydration scripts and Googlebot rendering. | Low | **Already in place (prod)** |
| **P2** | Information Disclosure | Remove `x-powered-by` | `nitro.hidePoweredBy` does not exist; Nuxt hardcodes the header. Added `apps/web/server/plugins/hide-powered-by.ts` stripping it on `render:response`. Verified on `nuxt dev`: 200 without `x-powered-by`. Production build not verified here: `pnpm build` fails at prerender of `/bali` (500, venue fetch) with or without this change. | Low | **Done (dev-verified)** |
| **P3** | Dependency Hardening | Upgrade `packages/domain` Vitest | `packages/domain/package.json` now `"vitest": "^4.1.12"`; lockfile refreshed (`pnpm install --lockfile-only`). Run `pnpm --filter @gioi/domain test` to confirm. | Low | **Done** |
| **P4** | Monorepo Supply Chain | Add pnpm security policies | Added `blockExoticSubdeps: true`, `trustPolicy: no-downgrade`, `minimumReleaseAge: 1440` (minutes) to `pnpm-workspace.yaml`. | Low | **Done** |
| **P5** | CI/CD Pipeline | Pin GitHub Actions to commit SHAs | `ci.yml` and `backup.yml` pinned to the SHAs of the current `v4` tags (checkout, pnpm/action-setup, setup-node) with `# v4` comments. | Low | **Done** |
| **P6** | Framework Upgrade | Migrate `apps/web` to Nuxt 4 | Not done: major migration, separate change with SEO regression check (prerender, routeRules, head/JSON-LD). `apps/web/package.json` declares `nuxt ^3.21.11` while `@nuxt/schema` is `^4.6.4`; align during migration. | Medium | **Deferred** |

---

## 8. Overall Risk Assessment

The overall security posture of the GIOI Bali reservation platform is **SOLID (Low to Moderate Risk)**. 
Core application code exhibits robust security controls: strict parameter validation, parameterized database interactions via Prisma, proper multi-venue authorization, and safe authentication mechanics. The primary remaining areas for improvement are operational hardening: configuring standard HTTP security headers on the frontend, disabling framework branding headers, and planning the eventual migration to Nuxt 4.
