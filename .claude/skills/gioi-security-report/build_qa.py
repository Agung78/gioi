#!/usr/bin/env python3
"""Render docs/reports/qa-e2e-browser-scenarios.md -> docs/reports/qa-e2e-browser-scenarios.pdf (GIOI house style).

Usage: python3 build_qa.py [input.md] [output.pdf]
The md is the only source: status symbols, counts, date and branch are derived from it.
"""
import re
import subprocess
import sys
from pathlib import Path

from build_report import ROOT, build

SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "docs/reports/qa-e2e-browser-scenarios.md"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "docs/reports/qa-e2e-browser-scenarios.pdf"

DIAGRAMS = [("Customer journey", "customer-journey"), ("Host journey", "host-journey"), ("Admin journey", "admin-journey"),
            ("Seating: admin journey", "seating-admin-journey"), ("Seating: host journey", "seating-host-journey")]
# Sections that start on a new page; every other heading just continues the page.
BREAK = ("Overview", "1. ")

md = SRC.read_text()

# --- counts from rows whose first cell is a scenario id and whose last cell starts with a status symbol
rows = [[c.strip() for c in l.strip().strip("|").split("|")] for l in md.splitlines() if l.startswith("|")]
st = [r[-1][:1] for r in rows if re.fullmatch(r"[A-Z]-\d+\w*", r[0]) and r[-1][:1] in "✔✘☐"]
npass, nfail, nrun = st.count("✔"), st.count("✘"), st.count("☐")
date = max(re.findall(r"\((20\d\d-\d\d-\d\d)", md))
branch = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "--abbrev-ref", "HEAD"], capture_output=True, text=True).stdout.strip()

# --- md -> report dialect
out = []
for ln in md.splitlines():
    if ln.strip() == "---" or ln.startswith("# GIOI"):
        continue
    ln = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", ln)  # drop links, keep text
    ln = re.sub(r"(?m)^(\s*- )✔ run", r"\1Pass: run", ln)
    ln = re.sub(r"(?m)^(\s*- )☐ (partial or )?not run", lambda m: f"{m.group(1)}{'Partial or n' if m.group(2) else 'N'}ot run", ln)
    ln = ln.replace("✔", "Pass").replace("✘", "Fail").replace("☐", "Not run")
    if ln.startswith("**Status:**"):
        ln = "Status: Pass, Fail (link the bug), Not run."
    if ln.startswith("**Priority:**"):
        ln = "**Priority:** P0 = release blocker, P1 = must pass before launch, P2 = polish."
    if ln.startswith("## "):
        title = ln[3:]
        if title.startswith(BREAK):
            out += ["", f"## {title}"]
            if title.startswith("1. "):  # diagram pages come right before the first scenario section
                pass
        else:
            ln = "# " + title
            out.append(ln)
        continue
    out.append(ln)
text = "\n".join(out)

diag = []
for name, f in DIAGRAMS:
    diag += [f"## {name}", "", f"> Source: docs/design/diagrams/{f}.excalidraw. Scenario IDs below map to these stages (see the coverage map).", "",
             f"![]({'../design/diagrams/' + f + '.png'})", ""]
text = text.replace("\n## 1. ", "\n" + "\n".join(diag) + "\n## 1. ", 1)

# --- overview page: stats right after the intro title, as in the house design
intro = f"""---
title: QA E2E Browser Scenarios
subtitle: apps/web (Nuxt)  ·  apps/api (Fastify)
meta: Customer · Host · Admin   |   {date}   |   branch {branch}
footer: GIOI · QA E2E Browser Scenarios
---

## Overview

**{npass + nfail + nrun}** scenarios carry a status: **{npass}** pass, **{nfail}** fail, **{nrun}** not run.

::: stats
{npass} | Passed | green
{nfail} | Failed | orange
{nrun} | Not run | blue
{npass + nfail + nrun} | Scenarios | tan
:::
"""
body = re.sub(r"\n(Status|\*\*Priority)", r"\n\n\1", text.lstrip("\n"))  # keep Priority/Status as separate paragraphs
build(intro + "\n" + body, OUT, SRC.parent)
