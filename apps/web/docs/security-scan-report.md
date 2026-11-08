# Security Scan Report — gioi-web

## 1. Header

| Field | Value |
|---|---|
| Scan date | 2026-11-08 |
| Repo | gioi (git root), app `apps/web` (`@gioi/web`, Nuxt 3) |
| Report path | `apps/web/docs/security-scan-report.md` |
| Branch | `development` |
| Commit | `f61b15f61c0d202d408079d836a7ea81346d14e3` (2026-11-08 09:30:16 +0800) |
| Working tree | clean (`git status --short` empty) — scan reflects commit `f61b15f`, not uncommitted changes |
| Scope | `apps/web` only. `apps/api` (peer, scanned separately by ScanApi) not touched. |

**Commands run**

SAST (from `apps/web`):
```
semgrep scan --config=auto --json --output=/tmp/gioi-web-semgrep.json .
```

SCA (cve-mcp-server, in-process, bypassing MCP transport):
```
cp ~/.claude/skills/security-scan/scripts/osv_scan_template.py /tmp/gioi-web-osv_scan.py
# substituted CVE_MCP_SRC=/Users/heyrcg/Documents/Works/llm-skills/cve-mcp-server/src
#   OUT_PATH=/tmp/gioi-web-cve-mcp.json
#   PACKAGE_GROUPS = apps/web (package.json), 24 packages, installed versions from node_modules/<pkg>/package.json
cd /Users/heyrcg/Documents/Works/llm-skills/cve-mcp-server && source .venv/bin/activate && python3 /tmp/gioi-web-osv_scan.py
# cross-reference per advisory:
curl -s https://api.osv.dev/v1/vulns/<id>
curl -s "https://api.first.org/data/v1/epss?cve=<cve>"
curl -s https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json  (fetched once, 1769 KEV entries)
```

DAST (OWASP ZAP baseline, passive, auto-detected local dev server):
```
docker run --rm -v /tmp/gioi-web-zap:/zap/wrk:rw --add-host host.docker.internal:host-gateway \
  ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://host.docker.internal:3000 -r zap-report.html -J zap-report.json -I
```

**Reachability check (DAST target)** — web dev server auto-detected on port 3000 (`nuxt dev` script in package.json):
- `curl http://localhost:3000/` → 307; `curl http://127.0.0.1:3000/` → 307
- `lsof -i :3000 -P -n` → `node` listening on `*:3000` (IPv4, all interfaces) — reachable from the ZAP container via `host.docker.internal`
- Resolved DAST target: `http://host.docker.internal:3000` (verified responding before scan)

**Statement:** No source code, config, dependencies, or lockfiles were modified. No findings were suppressed or omitted. Raw outputs preserved at `/tmp/gioi-web-semgrep.json`, `/tmp/gioi-web-cve-mcp.json`, `/tmp/gioi-web-zap/zap-report.json` (and `.html`).

---

## 2. Tooling integration

| Layer | Tool | What it checks | Wired into CI? | Re-run command |
|---|---|---|---|---|
| SAST | Semgrep 1.181.0 (`--config=auto`) | Static analysis, 390 community/pro rules across TS/JS/JSON/multilang | No — ad hoc, this session only | `semgrep scan --config=auto --json --output=/tmp/gioi-web-semgrep.json .` (from `apps/web`) |
| SCA | OSV.dev via cve-mcp-server `scan_dependencies_bulk` (in-process; no cve-mcp MCP server connected this session) | Declared vs installed npm dependency versions against OSV.dev advisories | No — ad hoc, this session only | `cd <cve-mcp-server> && source .venv/bin/activate && python3 /tmp/gioi-web-osv_scan.py` |
| DAST | OWASP ZAP `zaproxy:stable` `zap-baseline.py` (passive) | Passive spider + passive scan rules against running local dev server | No — local-only by design, never automated into CI | `docker run --rm -v /tmp/gioi-web-zap:/zap/wrk:rw --add-host host.docker.internal:host-gateway ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://host.docker.internal:3000 -r zap-report.html -J zap-report.json -I` |

---

## 3. Semgrep (SAST)

### Summary by severity

| Severity | Count |
|---|---|
| Error | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| Info | 0 |
| **Total findings** | **0** |

Semgrep ran 390 rules on 41 git-tracked files (~100% parsed lines) with **0 findings**.

### Per-rule detail

No rules fired, so there are no file:line hits, CWE/OWASP mappings, or verdicts to report. There is nothing to suppress and nothing confirmed.

---

## 4. Dependency CVE (SCA)

One manifest scanned: `apps/web/package.json` (24 packages, dependencies + devDependencies). Installed versions resolved from `node_modules/<pkg>/package.json` (not just declared ranges).

### CVE table — apps/web (package.json)

| Package | Declared | Installed | Advisory | CVE | CVSS | EPSS | KEV | Vulnerable (installed)? |
|---|---|---|---|---|---|---|---|---|
| nuxt | ^3.16.0 | 3.21.11 | GHSA-jjm6-p2m9-9w4x | CVE-2026-114130 | CVSSv4 LOW (vector only) | 0.00406 | no | Yes — range [0, 4.6.0) |
| nuxt | ^3.16.0 | 3.21.11 | GHSA-vjh5-4x84-xrqp | CVE-2026-114132 | CVSSv4 MODERATE (vector only) | 0.00424 | no | Yes — range [3.0.0, ∞) |
| nuxt | ^3.16.0 | 3.21.11 | GHSA-xfq5-w38q-pc2x | CVE-2026-114133 | CVSS 3.1 vector, score n/a | 0.00220 | no | Yes — range [3.13.0, 4.6.2) |
| happy-dom | ^15.0.0 | 15.11.7 | GHSA-37j7-fg3j-429f | CVE-2025-61927 | n/a | 0.00642 | no | Yes — range [0, 20.0.0) |
| happy-dom | ^15.0.0 | 15.11.7 | GHSA-5fpq-26gf-qwcr | CVE-2026-118661 | CVSS 3.1 vector, score n/a | 0.00272 | no | Yes — range [0, 20.14.6) |
| happy-dom | ^15.0.0 | 15.11.7 | GHSA-6q6h-j7hj-3r64 | CVE-2026-33943 | CVSS 3.1 vector, score n/a | 0.00646 | no | Yes — range [15.10.0, 20.8.8) |
| happy-dom | ^15.0.0 | 15.11.7 | GHSA-c8p4-j97h-3vg8 | CVE-2026-118660 | CVSS 3.1 vector, score n/a | 0.00405 | no | Yes — range [0, 21.0.0) |
| happy-dom | ^15.0.0 | 15.11.7 | GHSA-w4gp-fjgq-3q4g | CVE-2026-34226 | CVSS 3.1 vector, score n/a | 0.00466 | no | Yes — range [0, 20.8.9) |
| vitest | ^2.1.8 | 2.1.9 | GHSA-5xrq-8626-4rwp | CVE-2026-47429 | CVSS 3.1 vector, score n/a | 0.01028 | no | Yes — range [0, 3.2.6) |
| vitest | ^2.1.8 | 2.1.9 | GHSA-82fw-gwwq-j7x9 | CVE-2026-84373 | CVSS 3.1 vector, score n/a | 0.00527 | no | Yes — range [2.1.0, 4.1.11) |

All 10 returned advisories matched an affected range covering the installed version → **10 vulnerable advisories across 3 packages**. No advisory returned was a false positive on version attribution; sub-dependency attribution does not apply here (OSV attributed each directly to nuxt/happy-dom/vitest, all of which are direct deps present in the installed tree). No CVE appears in the CISA KEV catalog.

### Details per finding

**nuxt — GHSA-jjm6-p2m9-9w4x / CVE-2026-114130** — LOW (CVSSv4). Incomplete fix for GHSA-934w-87qh-qr26: a `javascript:` URL prefixed with an ASCII control character executes from `<NuxtLink>` when `pages` is disabled. CWE-79.
- Practical-risk note: gioi-web has a `pages/` directory and uses vue-router, so this code path is not active. **Confirmed-but-low-practical-risk.**
- Remediation: upgrade nuxt to ≥ 4.6.0.

**nuxt — GHSA-vjh5-4x84-xrqp / CVE-2026-114132** — MODERATE (CVSSv4). Server-side route rules (`redirect`, `headers`, `proxy`, `ssr`) skipped for case-variant paths when routing is case-insensitive. CWE-178 / CWE-863. gioi-web relies on routeRules (`/login`, `/host`, `/admin/**`, `/guests/**` ssr:false). **Confirmed.**
- Remediation: upgrade nuxt to ≥ 4.6.2.

**nuxt — GHSA-xfq5-w38q-pc2x / CVE-2026-114133** — CVSS 3.1 `AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:L/A:N`, score not published. Server islands render `useHeadSafe` input without sanitisation. gioi-web does not use `.server.vue` / `<NuxtIsland>` server islands (no server components found). **Confirmed-but-low-practical-risk.**
- Remediation: upgrade nuxt to ≥ 4.6.2.

**happy-dom — GHSA-37j7-fg3j-429f / CVE-2025-61927** — score not published. VM Context Escape → RCE when untrusted JS is run in Happy DOM's VM. happy-dom is a devDependency (vitest environment). **Confirmed.**
- Practical-risk note: only reachable if untrusted code is fed to happy-dom at test time; not part of the production server.
- Remediation: upgrade happy-dom to ≥ 20.0.0.

**happy-dom — GHSA-5fpq-26gf-qwcr / CVE-2026-118661** — CVSS 3.1 vector `AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N`, score not published. Cookie scope forgery (no DNS-label boundary on Domain= matching). **Confirmed.**
- Remediation: upgrade happy-dom to ≥ 20.14.6.

**happy-dom — GHSA-6q6h-j7hj-3r64 / CVE-2026-33943** — CVSS 3.1 vector `AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H`, score not published. RCE via unsanitized export names in `ECMAScriptModuleCompiler`. **Confirmed.**
- Remediation: upgrade happy-dom to ≥ 20.8.8.

**happy-dom — GHSA-c8p4-j97h-3vg8 / CVE-2026-118660** — CVSS 3.1 vector `AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:N/A:N`, score not published. SSRF via iframe / link stylesheet when parsing untrusted HTML. **Confirmed.**
- Remediation: upgrade happy-dom to ≥ 21.0.0.

**happy-dom — GHSA-w4gp-fjgq-3q4g / CVE-2026-34226** — CVSS 3.1 vector `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N`, score not published. Fetch `credentials: "include"` leaks page-origin cookies to request target. **Confirmed.**
- Remediation: upgrade happy-dom to ≥ 20.8.9.

**vitest — GHSA-5xrq-8626-4rwp / CVE-2026-47429** — CVSS 3.1 vector `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`, score not published. Arbitrary file read/execute when Vitest UI server listens (esp. `--api.host` or Windows). **Confirmed.**
- Practical-risk note: dev tool; exploitable only if Vitest UI is exposed to the network.
- Remediation: upgrade vitest to ≥ 3.2.6 (affected range [0, 3.2.6)).

**vitest — GHSA-82fw-gwwq-j7x9 / CVE-2026-84373** — CVSS 3.1 vector `AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N`, score not published. Path traversal / arbitrary file read via `@vitest/mocker` redirect mock. **Confirmed.**
- Remediation: upgrade vitest to ≥ 4.1.11.

CVSS note: OSV published CVSS vectors but no numeric baseScore for most advisories; NVD returned no data for CVE-2026-114130, CVE-2026-114132, CVE-2025-61927 (too new). No numbers were fabricated; "n/a" means not published in this run's API output.

---

## 5. DAST (OWASP ZAP)

**Scan mode:** Baseline (passive) — auto-detected local dev server, default for an unflagged `/security-scan`. No active attack injection.

**Target:** `http://host.docker.internal:3000` (auto-detected; not caller-supplied). Verified responding before scan: `localhost:3000` → 307, `127.0.0.1:3000` → 307, bind `*:3000` IPv4 all interfaces.

**Counts:** PASS 58, WARN-NEW 10, FAIL-NEW 0, INFO 0, IGNORE 0. 46 URLs crawled. No FAIL alerts.

### WARN-NEW alerts

| Alert (ID) | Risk | Instances | Affected URLs |
|---|---|---|---|
| Missing Anti-clickjacking Header [10020] | Low | 3 | `/`, `/bali`, `/bali/book` |
| X-Content-Type-Options Header Missing [10021] | Low | 5 | `/`, `/bali`, `/bali/book`, `/robots.txt`, `/sitemap.xml` |
| Server Leaks Information via "X-Powered-By" [10037] | Low | 3 | `/`, `/bali`, `/bali/book` |
| Content Security Policy (CSP) Header Not Set [10038] | Low | 3 | `/`, `/bali`, `/bali/book` |
| Storable and Cacheable Content [10049] | Low | 8 | `/`, `/bali`, `/bali/book`, `_nuxt` CSS/JS assets |
| Permissions Policy Header Not Set [10063] | Low | 5 | `/`, `/bali`, `/bali/book`, `_nuxt` CSS |
| Cross-Domain Misconfiguration [10098] | Low | 5 | `_nuxt` CSS/JS assets |
| Modern Web Application [10109] | Info | 1 | `/bali/book` |
| Sub Resource Integrity Attribute Missing [90003] | Low | 3 | `/`, `/bali`, `/bali/book` |
| Cross-Origin-Embedder-Policy Header Missing or Invalid [90004] | Low | 13 | `/`, `/bali`, `/bali/book`, `/sitemap.xml`, `_nuxt` assets |

All 10 alerts are missing-response-header / caching WARNs (Low/Info). None indicate an exploitable vulnerability on their own; they are hardening gaps (COEP/CSP/anti-clickjacking/SRI). Raw ZAP JSON preserved at `/tmp/gioi-web-zap/zap-report.json`.

---

## 6. Prioritized remediation summary

| Priority | Tool | Finding | CVE / ID | Version | Risk basis | Action |
|---|---|---|---|---|---|---|
| 1 | SCA | happy-dom RCE via module compiler | CVE-2026-33943 / GHSA-6q6h-j7hj-3r64 | 15.11.7 | C:H/I:H/A:H | upgrade happy-dom ≥ 20.8.8 |
| 2 | SCA | vitest arbitrary file read/execute (UI) | CVE-2026-47429 / GHSA-5xrq-8626-4rwp | 2.1.9 | C:H/I:H/A:H | upgrade vitest ≥ 3.2.6 |
| 3 | SCA | happy-dom SSRF via iframe/stylesheet | CVE-2026-118660 / GHSA-c8p4-j97h-3vg8 | 15.11.7 | C:H (S:C) | upgrade happy-dom ≥ 21.0.0 |
| 4 | SCA | happy-dom cookie-origin leak | CVE-2026-34226 / GHSA-w4gp-fjgq-3q4g | 15.11.7 | C:H | upgrade happy-dom ≥ 20.8.9 |
| 5 | SCA | nuxt route rules bypass (case) | CVE-2026-114132 / GHSA-vjh5-4x84-xrqp | 3.21.11 | MODERATE; app uses routeRules | upgrade nuxt ≥ 4.6.2 |
| 6 | SCA | happy-dom VM escape RCE (test env) | CVE-2025-61927 / GHSA-37j7-fg3j-429f | 15.11.7 | RCE, dev-only | upgrade happy-dom ≥ 20.0.0 |
| 7 | SCA | happy-dom cookie scope forgery | CVE-2026-118661 / GHSA-5fpq-26gf-qwcr | 15.11.7 | C:L/I:L | upgrade happy-dom ≥ 20.14.6 |
| 8 | SCA | vitest path traversal via mocker | CVE-2026-84373 / GHSA-82fw-gwwq-j7x9 | 2.1.9 | C:H (AC:H, dev-only) | upgrade vitest ≥ 4.1.11 |
| 9 | SCA | nuxt NuxtLink javascript: XSS | CVE-2026-114130 / GHSA-jjm6-p2m9-9w4x | 3.21.11 | LOW; app uses pages/ + vue-router | upgrade nuxt ≥ 4.6.0 |
| 10 | SCA | nuxt server-island useHeadSafe | CVE-2026-114133 / GHSA-xfq5-w38q-pc2x | 3.21.11 | app has no server islands | upgrade nuxt ≥ 4.6.2 |
| 11 | DAST | Missing COEP header | [90004] | n/a | 13 instances | add `Cross-Origin-Embedder-Policy` |
| 12 | DAST | Missing CSP | [10038] | n/a | 3 instances | add Content-Security-Policy |
| 13 | DAST | Missing anti-clickjacking / XFO | [10020] | n/a | 3 instances | add `X-Frame-Options` / frame-ancestors |
| 14 | DAST | Missing X-Content-Type-Options | [10021] | n/a | 5 instances | add `X-Content-Type-Options: nosniff` |
| 15 | DAST | Missing Permissions-Policy | [10063] | n/a | 5 instances | add Permissions-Policy header |
| 16 | DAST | X-Powered-By disclosure | [10037] | n/a | 3 instances | remove/disable header |
| 17 | DAST | Missing SRI | [90003] | n/a | 3 instances | add Subresource Integrity |
| 18 | DAST | Cacheable content / X-CTO on assets | [10049]/[10098] | n/a | 8/5 instances | review cache headers |

Note: happy-dom and vitest are devDependencies (test tooling), not shipped to production, so their real production exposure is limited. nuxt is the production dependency with confirmed findings.

---

## 7. Overall risk assessment

gioi-web's SAST surface is clean: Semgrep found no issues across 390 rules on 41 files. The DAST baseline against the running local dev server found only passive Low/Info hardening gaps (missing security headers, no CSP/COEP/SRI, X-Powered-By disclosure) — no FAIL alerts, no active injection performed.

The principal risk is in dependencies: 10 confirmed vulnerable advisories across nuxt (production) and happy-dom/vitest (dev tooling). Two carry CVSS C:H/I:H/A:H vectors (happy-dom module-compiler RCE, Vitest UI file read), but both are in dev-only packages reachable only in the test/development context, and none of the CVEs are in CISA KEV or carry high EPSS (max 0.0103). The production nuxt findings are real (route-rule bypass) but MODERATE/LOW and mitigated by the app using `pages/` + vue-router for the XSS one. Aggregate posture: **moderate, driven almost entirely by out-of-date dev dependencies and a production nuxt version behind two security releases**; upgrade nuxt, happy-dom, and vitest to the fixed versions listed above. No source changes, suppressions, or CI wiring are required from this scan.

---

**Raw outputs:** `/tmp/gioi-web-semgrep.json`, `/tmp/gioi-web-cve-mcp.json`, `/tmp/gioi-web-zap/zap-report.json`, `/tmp/gioi-web-zap/zap-report.html`.