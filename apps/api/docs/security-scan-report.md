# Security Scan Report — gioi-api

**App:** gioi-api (`/Users/heyrcg/Documents/Works/gioi/apps/api`)  
**Report:** `apps/api/docs/security-scan-report.md` (fully rewritten)  
**Date:** 2026-11-08  
**Repo:** `gioi` (git root `/Users/heyrcg/Documents/Works/gioi`)  
**Branch:** `development`  
**Commit:** `f61b15f61c0d202d2026a7ea81346d14e3` (2026-11-08 09:30:16 +0800)  
**Working tree:** clean (`git status --short` empty — no uncommitted changes; scan reflects working tree)

---

## Scope

Scanned `apps/api` only (name `gioi-api`). The sibling app dir (`apps/web`) was not touched.

- **Source/config/lockfiles modified:** none.
- **Suppressed findings:** none. Every tool hit is reported, including false positives with reasoning.
- **No source, dependency, lockfile, or config changes were made.**

## Tooling

| Tool | Role | Status | Re-run command |
|------|------|--------|----------------|
| Semgrep (config=auto) | SAST | wired, run | `cd apps/api && semgrep scan --config=auto --json --output=/tmp/gioi-api-semgrep.json .` |
| cve-mcp-server + OSV.dev batch API | SCA | wired, run (in-process) | `python /tmp/gioi-api-osv_scan.py` (uses `/Users/heyrcg/Documents/Works/llm-skills/cve-mcp-server/.venv`) |
| OWASP ZAP `zap-baseline.py` (passive) | DAST | run | `docker run --rm -v /tmp/gioi-api-zap:/zap/wrk:rw --add-host host.docker.internal:host-gateway ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://host.docker.internal:3001 -r zap-report.html -J zap-report.json -I` |

Nothing is wired into CI for this app. Raw outputs preserved in `/tmp/gioi-api-*`.

## DAST target & reachability

- Dev server: `127.0.0.1:3001` (binds IPv4 only, not IPv6-only — reachable from Docker via `host.docker.internal`). Confirmed via `lsof -i :3001 -P -n` (node PID 88837, LISTEN `127.0.0.1:3001`) and `curl http://host.docker.internal:3001/` → `404` (reachable).
- Docker: 29.7.2 works.
- ZAP baseline scanned `http://host.docker.internal:3001`. Spider from `/` yields little coverage: only `http://host.docker.internal:3001` (404), `/robots.txt` (404), `/sitemap.xml` (404) were discovered. No OpenAPI/swagger spec or route list exists in the repo to feed ZAP as hints, so DAST coverage is limited to the root path.
- Server was already running (service `gioi-api-local5`); not restarted or killed by this scan.

## Raw output locations

- `/tmp/gioi-api-semgrep.json` — Semgrep JSON output (0 findings)
- `/tmp/gioi-api-cve-mcp.json` — cve-mcp-server / OSV.dev batch scan JSON
- `/tmp/gioi-api-osv_scan.py` — the SCA runner script (copy of the skill template with substituted values)
- `/tmp/gioi-api-zap/zap-report.json` — ZAP JSON report
- `/tmp/gioi-api-zap/zap-report.html` — ZAP HTML report

---

## SAST — Semgrep

`semgrep scan --config=auto --json --output=/tmp/gioi-api-semgrep.json .` ran 389 rules on 47 git-tracked files (~99.7% parsed lines).

**Result: 0 findings.**

Semgrep `config=auto` returned no matches across TypeScript, JSON, and JS sources. There are no SAST hits to triage, so no per-rule subsections apply. No false positives to record because the scanner produced nothing.

## SCA — OSV.dev via cve-mcp-server

Resolved **installed** versions from `node_modules/*/package.json` (no `package-lock.json` exists in the app dir, so versions were read directly from the installed tree; lockfile/workspace-root `node_modules` checked — none present). Each package was queried against OSV.dev via `cve_mcp.api.dependency_scan.scan_dependencies_bulk` (in-process, no live MCP transport needed).

### Dependency CVE table

| Manifest | Package | Declared | Installed | Advisory | CVE | CVSS | EPSS | KEV | Vulnerable? |
|----------|---------|----------|-----------|----------|-----|------|------|-----|-------------|
| package.json (dep) | @fastify/cookie | ^11.0.0 | 11.1.5 | — | — | — | — | — | No |
| package.json (dep) | @fastify/cors | ^10.0.0 | 10.1.0 | — | — | — | — | — | No |
| package.json (dep) | @node-rs/argon2 | ^2.0.0 | 2.0.0 | — | — | — | — | — | No |
| package.json (dep) | @prisma/adapter-pg | ^7.0.0 | 7.10.1 | — | — | — | — | — | No |
| package.json (dep) | @prisma/client | 7.10.1 | 7.10.1 | — | — | — | — | — | No |
| package.json (dep) | fastify | ^5.0.0 | 5.12.8 | — | — | — | — | — | No |
| package.json (dep) | prisma | ^7.0.0 | 7.10.1 | — | — | — | — | — | No |
| package.json (devDep) | @types/node | ^22 | 22.20.5 | — | — | — | — | — | No |
| package.json (devDep) | esbuild | ^0.28.2 | 0.28.2 | — | — | — | — | — | No |
| package.json (devDep) | supertest | ^7.0.0 | 7.3.1 | — | — | — | — | — | No |
| package.json (devDep) | tsx | ^4.0.0 | 4.23.15 | — | — | — | — | — | No |
| package.json (devDep) | typescript | ^5.7.2 | 5.9.3 | — | — | — | — | — | No |
| package.json (devDep) | vitest | ^2.1.8 | 2.1.9 | GHSA-5xrq-8626-4rwp | CVE-2026-47429 | — | 0.0103 | No | **Yes** |
| package.json (devDep) | vitest | ^2.1.8 | 2.1.9 | GHSA-82fw-gwwq-j7x9 | CVE-2026-84373 | — | 0.0053 | No | **Yes** |

(CVSS: OSV.dev records did not publish a numeric CVSS for these advisories; GitHub `database_specific.severity` is given below. EPSS date 2026-11-07. KEV checked via CISA `known_exploited_vulnerabilities.json` — neither CVE listed.)

### Advisory details

**GHSA-5xrq-8626-4rwp / CVE-2026-47429** — "When Vitest UI server is listening, arbitrary file can be read and executed"
- Installed: `vitest 2.1.9` (devDependency)
- Affected range: `0 → <3.2.6` (and `4.0.0 → <4.1.0`). Installed 2.1.9 is inside `0 → <3.2.6`. **Vulnerable: Yes.**
- GitHub severity: CRITICAL. CWE-22 (Path Traversal), CWE-862 (Missing Authorization).
- Arbitrary file read/exec when the Vitest UI server listens, especially if exposed to the network or running UI/Browser Mode on Windows. The `/__vitest_attachment__` API handler misuses `isFileServingAllowed`.
- EPSS: 0.0103 (percentile 0.6386). Not in CISA KEV.
- Practical risk: **Low in this app.** vitest is a devDependency (`^2.1.8`) used only for local test runs (`vitest run`), not shipped or exposed over the network. The Vitest UI server is not started. Fix: upgrade vitest to ≥3.2.6 (fixed) — but note 2.1.x is EOL for this fix line; moving to 3.x+ is the clean path.

**GHSA-82fw-gwwq-j7x9 / CVE-2026-84373** — "Vitest: Path Traversal / Arbitrary File Read via @vitest/mocker Redirect Mock"
- Installed: `vitest 2.1.9` (devDependency)
- Affected range: `2.1.0 → <4.1.11`. Installed 2.1.9 is inside. **Vulnerable: Yes.**
- GitHub severity: MODERATE. CWE-22 (Path Traversal).
- `@vitest/mocker` registers a redirect mock target without validating against the dev server's file-serving allowlist; an attacker reaching the dev server's WebSocket can register a redirect mock pointing outside the project root, disclosing local files via `readFile`.
- EPSS: 0.0053 (percentile 0.4489). Not in CISA KEV.
- Practical risk: **Low in this app.** Requires the Vitest dev server/interceptor reachable over the network and an attacker able to hit its HMR socket. vitest is a local-only devDependency; the production server (Fastify) does not use vitest. Fix: upgrade vitest to ≥4.1.11 (fixed in 4.1.11 / 5.0.0-rc.2).

Sub-dependency attribution: OSV batch query used direct package names/versions; no sub-dependency (transitive) trees were separately resolved because OSV matches on the exact package@version queried. The two advisories both target `vitest` itself, which is directly installed at 2.1.9, so attribution is direct and confirmed.

## DAST — OWASP ZAP (baseline, passive only)

Target: `http://host.docker.internal:3001` (the app's own dev server on port 3001, already running).

`zap-baseline.py -t http://host.docker.internal:3001 -r zap-report.html -J zap-report.json -I`

Result: **67 PASS, 1 WARN-NEW, 0 FAIL-NEW.**

| Alert ID | Alert | Risk | Instance(s) | Verdict |
|----------|-------|------|-------------|---------|
| 10049 | Storable and Cacheable Content | Informational (Medium) | `/`, `/robots.txt`, `/sitemap.xml` (all 404) | Informational — the only responses are 404s with cacheable headers; no sensitive content exposed. |

No active/scan policy attacks were run (baseline = passive only). Coverage limitation: spider from `/` returned only 3 URLs (all 404), so the app's route surface (`/health`, venues, reservations, staff auth/routes) was **not** exercised by ZAP. No OpenAPI/swagger spec or route list exists in the repo to supply as hints (`-O`/extra hints unavailable). Report this as limited coverage, not a clean pass.

Host-header allowlist check: `curl` to `localhost:3001/` returns 404 (not 403 across all URLs), so there is no host-header allowlist blocking ZAP; reachability is confirmed, not a coverage limitation from that cause.

## Prioritized remediation table

| Priority | Finding | Tool | Affected | Fix |
|----------|---------|------|----------|-----|
| 1 | vitest CVE-2026-47429 (GHSA-5xrq-8626-4rwp), CRITICAL | SCA | vitest 2.1.9 (devDep) | Upgrade vitest to ≥3.2.6 (4.1.0+ preferred). Low practical risk — dev-only, UI not exposed. |
| 2 | vitest CVE-2026-84373 (GHSA-82fw-gwwq-j7x9), MODERATE | SCA | vitest 2.1.9 (devDep) | Upgrade vitest to ≥4.1.11 (or 5.0.0-rc.2). Low practical risk — dev-only. |
| 3 | Storable and Cacheable Content (alert 10049) | DAST | root `/` (404) | Informational only; no action required unless sensitive endpoints are added and cached. |
| — | SAST: no findings | Semgrep | — | — |

## Overall risk

SAST (Semgrep `config=auto`) found no issues across the 47 scanned files. SCA found two vitest advisories (both devDependency-only, both low practical risk because vitest is not shipped, not exposed over the network, and the Vitest UI/server is not used in production). DAST baseline passed with only an informational cacheable-content warning on 404 responses, though route coverage was limited to `/` (no OpenAPI spec available to guide the spider). Overall risk is **low**; the highest-value action is upgrading `vitest` (currently 2.1.9, devDependency) to a version fixing both CVEs (≥3.2.6 for CVE-2026-47429; ≥4.1.11 for CVE-2026-84373 — i.e., 4.1.11+ satisfies both).
