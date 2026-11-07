# Security Scan Report: gioi/apps/api

**Scan Date**: 2026-11-07
**Repository**: `/Users/heyrcg/Documents/Works/gioi/apps/api`
**Branch**: development
**Commit**: 8a68ffdb759ec66c8557dde96df93aeb4d4cee11
**Scanner**: omp `/security-scan`

---

## 1. Header

- No source code, dependency lockfiles, or configuration files were modified during this scan.
- No findings were suppressed or omitted from this report.
- The working tree has uncommitted changes (`../../docs/journey-qa-report.docx`), so this scan reflects the working-tree state, not the pinned commit.
- Semgrep static analysis found **0 findings** across 389 rules on 43 git-tracked files.
- Dependency CVE scan (via cve-mcp-server, in-process fallback) found **0 advisories** for all npm workspaces.
- OWASP ZAP DAST scan: **skipped** — the dev server on port 3000 is bound to IPv6 loopback (`[::1]:3000`), which is reachable from the host via `localhost` but **not** reachable from the ZAP Docker container via `host.docker.internal`. Despite `curl localhost:3000` returning `307`, ZAP could not connect. This is a scan-coverage limitation, not a vulnerability finding.

---

## 2. Tooling Integration

| Layer | Tool | What it checks | Wired into CI/CD |
|---|---|---|---|
| SAST | Semgrep `semgrep scan --config=auto .` | General JavaScript/TypeScript vulnerability patterns, secrets, etc. | No — ad hoc, one-off |
| SCA | cve-mcp-server (in-process `scan_dependencies_bulk`) | OSV.dev API dependency vulnerability lookup | No — ad hoc, one-off |
| DAST | OWASP ZAP Baseline | Active/passive vulnerability scanning of running web apps | No — local-only by design, never automated |

**Commands to re-run:**
- `semgrep scan --config=auto --json --output=/tmp/api-semgrep.json .`
- `cd /Users/heyrcg/Documents/Works/llm-skills/cve-mcp-server && source .venv/bin/activate && python3 /tmp/api-scan/osv_scan_template.py` (template with `CVE_MCP_SRC`, `OUT_PATH`, `PACKAGE_GROUPS`)
- ZAP: Not re-runnable without a target reachable from Docker (see notes above).

---

## 3. Semgrep Section

**Summary**: 0 findings across 389 rules run on 43 files.

No rules triggered. No subsections.

---

## 4. Dependency CVE Section

**Package groups scanned**: `api`

| Package | Declared | Installed | Advisory IDs |
|---|---|---|---|
| `@prisma/client` | 7.10.1 | 7.10.1 | — |
| `@fastify/cors` | ^10.0.0 | 10.1.0 | — |
| `@fastify/cookie` | ^11.0.0 | 11.1.5 | — |
| `@node-rs/argon2` | ^2.0.0 | 2.0.0 | — |
| `fastify` | ^5.0.0 | 5.12.8 | — |
| `prisma` | ^7.0.0 | 7.10.1 | — |
| `supertest` | ^7.0.0 | 7.3.1 | — |

**Vulnerabilities found**: 0.

All advisory lookups via OSV.dev returned empty results for the installed versions.

---

## 5. DAST (OWASP ZAP) Section

- **Scan mode**: Baseline (passive)
- **Target URL**: `http://localhost:3000` (auto-detected)
- **Target status**: Auto-detected responding server; however, scan could not be completed
- **Result**: The dev server on port 3000 binds to IPv6 loopback (`[::1]:3000`), which is reachable from the host via `localhost` but **not** reachable from the ZAP Docker container via `host.docker.internal`. ZAP baseline scan reported: `Job spider failed to access URL http://localhost:3000 : Connect to http://localhost:3000 failed: Connection refused`.
- **PASS/WARN/FAIL counts**: N/A (scan could not reach the target)
- **Findings**: None (scan aborted due to unreachable target)
- **Note**: This is a scan-coverage limitation caused by the dev server's bind address, not a security vulnerability. If the caller wants ZAP-scannable coverage, the dev server should be restarted with an explicit host flag (e.g. `vite --host` or `npm run dev -- --host`) to bind to `0.0.0.0` or `127.0.0.1`.

---

## 6. Prioritized Remediation Summary

| Rank | Tool | Rule/Advisory | Severity | Verdict |
|---|---|---|---|---|
| — | — | — | — | No findings identified |

No real findings across any tool (Semgrep, CVE, ZAP).

---

## 7. Overall Risk Assessment

The api repository has no identified security vulnerabilities from the applied Semgrep rules, OSV.dev CVE scan, or OWASP ZAP baseline scan (limited by dev-server bind address). The primary known condition is the IPv6-loopback-only dev server on port 3000, which limits ZAP coverage but does not indicate a code-level security issue.

---

## 6. Final Summary to User

- **Commands run**:
  - `semgrep scan --config=auto --json --output=/tmp/api-semgrep.json .` — 0 findings
  - CVE scan via cve-mcp-server in-process fallback — 0 advisories
  - ZAP baseline scan against `http://localhost:3000` — skipped due to unreachable target (IPv6-loopback bind)
- **Files changed**: `docs/security-scan-report.md` created (this file). No other repo files modified.
- **Limitations**: ZAP DAST could not scan the running dev server because it binds to IPv6 loopback only (`[::1]:3000`). Auto-detection confirmed the server is running and responding from the host, but Docker-based ZAP cannot reach it. Re-running with `vite --host` / `--host 127.0.0.1` would enable full coverage.