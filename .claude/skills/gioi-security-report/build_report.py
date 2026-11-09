#!/usr/bin/env python3
"""Render docs/gioi_security_report.md -> docs/gioi_security_report.pdf (GIOI house style).

Usage: python3 build_report.py [input.md] [output.pdf]
Needs: reportlab (pip install reportlab).
"""
import re
import sys
from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (BaseDocTemplate, Frame, Image, NextPageTemplate, PageBreak, PageTemplate,
                                Paragraph, Spacer, Table, TableStyle)
import io
from PIL import Image as PILImage

ROOT = Path(__file__).resolve().parents[3]  # <repo>/.claude/skills/gioi-security-report/
LOGO = ROOT / "apps/web/public/logo.jpg"

NAVY, ORANGE, TAN = HexColor("#102638"), HexColor("#e87a3a"), HexColor("#d6c4a3")
BLUE, INK, MUTED = HexColor("#1f4a6b"), HexColor("#132f45"), HexColor("#4a626a")
BAND, LINE = HexColor("#f3f5f4"), HexColor("#d5dedf")
STAT = {"green": HexColor("#2e7d5b"), "orange": ORANGE, "blue": BLUE, "tan": TAN}
W, H = A4
M = 57  # side margin (pt)

body = ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, leading=14, textColor=INK, spaceAfter=6)
note = ParagraphStyle("note", parent=body, fontSize=7.5, leading=11, textColor=MUTED)
h2 = ParagraphStyle("h2", fontName="Helvetica", fontSize=19, leading=24, textColor=NAVY, spaceAfter=8)
h3 = ParagraphStyle("h3", fontName="Helvetica", fontSize=12.5, leading=16, textColor=BLUE, spaceBefore=12, spaceAfter=6)
h4 = ParagraphStyle("h4", parent=h3, fontSize=11, spaceBefore=10)
cell = ParagraphStyle("cell", fontName="Helvetica", fontSize=7.5, leading=10, textColor=INK)
head = ParagraphStyle("head", parent=cell, textColor=white, charSpace=0.4)
bullet = ParagraphStyle("bullet", parent=body, fontSize=8.5, leading=12, leftIndent=14, bulletIndent=3, spaceAfter=2)
bullet2 = ParagraphStyle("bullet2", parent=bullet, leftIndent=28, bulletIndent=17)


SAFE = {"→": "->", "…": "...", "≥": ">=", "≤": "<=", "↔": "<->", "−": "-"}  # glyphs missing from Helvetica (draw as boxes)


def inline(s):
    for k, v in SAFE.items():
        s = s.replace(k, v)
    bad = {c for c in s if ord(c) > 127 and not c.encode("cp1252", "ignore")}
    if bad:
        print("WARNING unsupported glyphs:", bad)
    esc = lambda x: x.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    out, bold = [], False
    for i, p in enumerate(s.split("`")):  # odd parts are code spans; ** is bold only outside them
        if i % 2:
            out.append(f'<font face="Courier">{esc(p)}</font>')
            continue
        for j, seg in enumerate(p.split("**")):
            if j:
                bold = not bold
                out.append("<b>" if bold else "</b>")
            out.append(esc(seg))
    return "".join(out) + ("</b>" if bold else "")


WEIGHT = {"ID": 10, "P": 8, "#": 3, "Status": 14}  # fixed column weights by header name
STATUS = {"Pass": STAT["green"], "Fail": ORANGE, "Not run": MUTED}


def table(rows):
    data = [[Paragraph(inline(c), head if i == 0 else cell) for c in r] for i, r in enumerate(rows)]
    for r in range(1, len(rows)):  # color a leading Pass / Fail / Not run in a Status column
        for j, h in enumerate(rows[0]):
            col = h == "Status" and next((v for k, v in STATUS.items() if rows[r][j].startswith(k)), None)
            if col:
                data[r][j] = Paragraph(inline(rows[r][j]), ParagraphStyle("s", parent=cell, textColor=col))
    wt = [WEIGHT.get(h, min(max(max(len(r[j]) for r in rows), 6), 32)) for j, h in enumerate(rows[0])]
    cw = [(W - 2 * M) * w / sum(wt) for w in wt]
    t = Table(data, colWidths=cw, repeatRows=1)
    st = [("BACKGROUND", (0, 0), (-1, 0), BLUE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
          ("LEFTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 4.5),
          ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5), ("LINEBELOW", (0, 1), (-1, -1), 0.5, LINE)]
    st += [("BACKGROUND", (0, i), (-1, i), BAND) for i in range(2, len(rows), 2)]
    t.setStyle(TableStyle(st))
    return t


def stats(items):
    gap, n = 8, len(items)
    cw = (W - 2 * M - gap * (n - 1)) / n
    cells = []
    for num, label, color in items:
        c = STAT[color]
        cells.append(Table([[Paragraph(f'<font size="20" color="{c.hexval().replace("0x", "#")}">{inline(num)}</font>', body)],
                            [Paragraph(f'<font size="7.5" color="#4a626a">{inline(label)}</font>', body)]],
                           colWidths=[cw], style=[("BACKGROUND", (0, 0), (-1, -1), BAND), ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                                                  ("LINEABOVE", (0, 0), (-1, 0), 3, c), ("LEFTPADDING", (0, 0), (-1, -1), 7),
                                                  ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 9)]))
    row = Table([cells], colWidths=[cw + gap] * (n - 1) + [cw], hAlign="LEFT")
    row.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), gap),
                             ("VALIGN", (0, 0), (-1, -1), "TOP")]))
    return row


def parse(text, base):
    m = re.match(r"---\n(.*?)\n---\n(.*)", text, re.S)
    meta = dict(re.findall(r"^(\w+):\s*(.*)$", m.group(1), re.M))
    flow, lines, i = [], m.group(2).splitlines(), 0
    while i < len(lines):
        ln = lines[i].rstrip()
        if not ln:
            i += 1
        elif ln.startswith("::: stats"):
            items = []
            i += 1
            while lines[i].strip() != ":::":
                items.append([x.strip() for x in lines[i].split("|")]); i += 1
            flow += [stats(items), Spacer(1, 10)]; i += 1
        elif ln.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                r = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-+:?", c) for c in r):
                    rows.append(r)
                i += 1
            flow += [table(rows), Spacer(1, 6)]
        elif ln.startswith("## "):
            flow += [PageBreak(), Paragraph(inline(ln[3:]), h2)]; i += 1
        elif ln.startswith("# "):  # same look as ##, no page break
            flow.append(Paragraph(inline(ln[2:]), h2)); i += 1
        elif ln.startswith("#### "):
            flow.append(Paragraph(inline(ln[5:]), h4)); i += 1
        elif ln.startswith("### "):
            flow.append(Paragraph(inline(ln[4:]), h3)); i += 1
        elif re.match(r"!\[.*\]\(.+\)", ln):  # image, scaled to fit the frame
            p = base / re.match(r"!\[.*\]\((.+)\)", ln).group(1)
            im = PILImage.open(p).convert("RGB")
            im.thumbnail((2600, 2600))
            buf = io.BytesIO(); im.save(buf, "JPEG", quality=85); buf.seek(0)
            s = min((W - 2 * M) / im.width, 600 / im.height)
            flow.append(Image(buf, im.width * s, im.height * s, hAlign="LEFT")); i += 1
        elif re.match(r"\s*- ", ln):  # bullet list; two-space indent = nested
            while i < len(lines) and re.match(r"\s*- ", lines[i]):
                nest = lines[i].startswith("  ")
                flow.append(Paragraph(inline(lines[i].strip()[2:]), bullet2 if nest else bullet,
                                      bulletText="-" if nest else "•"))
                i += 1
            flow.append(Spacer(1, 4))
        else:  # paragraph; "> " prefix = small muted note
            buf = []
            while i < len(lines) and lines[i].strip() and not re.match(r"(#|\||::: |!\[|\s*- )", lines[i]):
                buf.append(lines[i].strip()); i += 1
            txt = " ".join(buf)
            flow.append(Paragraph(inline(txt[2:]), note) if txt.startswith("> ") else Paragraph(inline(txt), body))
    return meta, flow


def build(text, out, base):
    meta, flow = parse(text, base)
    footer = meta.get("footer", "GIOI · " + meta["title"].replace("\\n", " "))

    def cover(c, d):
        def txt(x, y, s, size, cs=0):
            t = c.beginText(x, y); t.setFont("Helvetica", size); t.setCharSpace(cs); t.textOut(s); c.drawText(t)
        x0 = 62
        c.setFillColor(NAVY); c.rect(0, 0, W, H, stroke=0, fill=1)
        c.setFillColor(TAN)
        txt(x0, H - 76, meta.get("kicker", "G I O I  ·  BALI RESERVATION PLATFORM"), 9, 0.9)
        c.drawImage(str(LOGO), W - 61 - 85, H - 113, 85, 85)
        c.setFillColor(white)
        for k, t in enumerate(meta["title"].split("\\n")):
            txt(x0, H - 418 - k * 38, t, 34, 1.2)
        c.setFillColor(ORANGE); c.rect(0, H - 538, 62, 5, stroke=0, fill=1)
        c.setFillColor(TAN)
        txt(x0, H - 571, meta["subtitle"], 10, 0.5); txt(x0, H - 592, meta["meta"], 10, 0.5)

    def page(c, d):
        c.setFillColor(ORANGE); c.rect(0, H - 8.5, W, 8.5, stroke=0, fill=1)
        c.setStrokeColor(LINE); c.setLineWidth(0.5); c.line(M, 46, W - M, 46)
        c.setFillColor(MUTED); c.setFont("Helvetica", 7)
        c.drawString(M, 34, footer); c.drawRightString(W - M, 34, str(d.page))

    doc = BaseDocTemplate(str(out), pagesize=A4, title=meta["title"].replace("\\n", " "), author="GIOI")
    fr = Frame(M, 60, W - 2 * M, H - 60 - 53, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate("cover", [fr], onPage=cover), PageTemplate("body", [fr], onPage=page)])
    doc.build([NextPageTemplate("body")] + flow)
    print(f"wrote {out}")


if __name__ == "__main__":
    SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "docs/gioi_security_report.md"
    build(SRC.read_text(), Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "docs/gioi_security_report.pdf", SRC.parent)
