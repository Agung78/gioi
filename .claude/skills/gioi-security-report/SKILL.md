---
name: gioi-security-report
description: "Generate GIOI house-style PDFs in docs/: gioi_security_report.pdf (from apps/api + apps/web security-scan-report.md) and qa-e2e-browser-scenarios.pdf (from docs/reports/qa-e2e-browser-scenarios.md). Trigger: 'generate the GIOI security report' / 'generate the QA scenarios PDF'."
---

# GIOI PDFs (security report, QA scenarios)

Both PDFs share one renderer (`build_report.py`) and design: navy cover with GIOI logo, orange accent bar, stat cards, blue-header zebra tables, footer + page number.

**PDF generation MUST follow the Anthropic PDF skill:** read https://raw.githubusercontent.com/anthropics/skills/main/skills/pdf/SKILL.md first (reportlab section; never use Unicode sub/superscript glyphs, use `<sub>`/`<super>`; verify with `pdftotext`/`pdftoppm`). Needs `pip install reportlab pillow`.

All commands run from `.claude/skills/gioi-security-report/`.

## A. QA E2E scenarios PDF (no AI writing needed)
Source of truth is `docs/reports/qa-e2e-browser-scenarios.md` only.
1. (If asked to update results) edit the md: statuses `✔` pass, `✘` fail, `☐` not run.
2. `python3 build_qa.py` -> `docs/reports/qa-e2e-browser-scenarios.pdf` (optional args: `[in.md] [out.pdf]`).
   The script derives pass/fail/not-run counts (rows with an ID like `G-01` and a status), date (latest `(YYYY-MM-DD` in the md) and git branch; maps `✔/✘/☐` to Pass/Fail/Not run (Helvetica has no such glyphs); replaces `→ … ≥ ≤` with ASCII; inserts the 5 diagrams from `docs/design/diagrams/*-journey.png` as pages before section 1. Only the Overview and section 1 start a new page.
3. Verify: `pdftoppm -r 80 -png ...` and look at cover, Overview, a table page, a diagram page, the last page. Watch for `WARNING unsupported glyphs` in the output: add the glyph to `SAFE` in `build_report.py`.

## B. Security report PDF
Inputs: `apps/api/docs/security-scan-report.md`, `apps/web/docs/security-scan-report.md`, previous `docs/reports/gioi_security_report.md` (remediation already applied / open items). Run `/security-scan` first if either input is stale (check Date/Commit).
1. Read both inputs. Write `docs/reports/gioi_security_report.md` (editable source) in the format below. Condense; client-readable; no invented numbers: counts, EPSS, CVE ids, ZAP ids come straight from the inputs.
2. `python3 build_report.py` -> `docs/reports/gioi_security_report.pdf` (optional args: `[in.md] [out.pdf]`).
3. Verify all pages visually (~4 pages).

### `docs/reports/gioi_security_report.md` format
Front matter: `title` (`\n` = line break), `subtitle`, `meta` (`SAST · SCA · DAST | date | branch X`), `footer`, optional `kicker`.
Each `##` starts a new page:
1. `## Executive summary`: one paragraph (commit, tools, overall risk, KEV/EPSS), a stats block, `### Remediation applied` table + `>` note, `#### Open: <pkg>` paragraph.
2. `## Findings by layer`: `### SAST · Semgrep`, `### SCA · OSV.dev` (Package|Advisory|Severity|EPSS|Status), `### DAST · OWASP ZAP baseline (passive)` (Alert|ID|Fix).
3. `## Next steps`: table `# | Action | Why | Effort`, then a `>` "Method and limits" note.

Renderer syntax (shared): pipe tables (first row = header; a `Status` column starting with Pass/Fail/Not run is colored), `**bold**`, `` `code` ``, `> ` small muted note, `- ` / `  - ` bullets, `# ` heading without page break, `![](rel/path.png)` image scaled to fit, stats block:
```
::: stats
0 | SAST findings | green
:::
```
Colors: green, orange, blue, tan.

## Design (encoded in build_report.py; do not change)
A4, Helvetica/Courier, navy `#102638`, orange `#e87a3a`, tan `#d6c4a3`, blue `#1f4a6b`, zebra `#f3f5f4`, lines `#d5dedf`, logo `apps/web/public/logo.jpg`.
