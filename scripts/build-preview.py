#!/usr/bin/env python3
"""Builds a static preview of the widget for desktop and terminal.

The plugin's own code renders each sample state: a temporary test prints the
desktop SVG and the terminal line, and this script lays them out in an HTML
page. Hover the desktop rows to see the tooltips.

    python3 scripts/build-preview.py [output.html]

It also renders docs/screenshot.png (the image in the README) with Chrome in
headless mode, when Chrome is installed. scripts/build-demo.py makes the GIF.

The default output is docs/preview.html, kept in git as a visual reference:
regenerate it whenever the drawing or the texts change.
The terminal rows mock Claude Code's prompt; the line itself is the real one.
"""

import html
import sys
from pathlib import Path

from render import DOCS, render_cases, screenshot

OUTPUT = Path(sys.argv[1]) if len(sys.argv) > 1 else DOCS / "preview.html"

# (caption, % used, hours until the reset)
CASES = [
    ("Verde: por debajo del ritmo", 12, 4.4),
    ("Amarillo: un poco por encima", 25, 4),
    ("Rojo: muy por encima", 60, 3),
    ("100%: límite alcanzado", 100, 1),
    ("Ventana reiniciada", 3, -1),
]

renders = render_cases([(used, hours) for _, used, hours in CASES])

desktop = {
    language: "".join(
        f'<figure><figcaption>{html.escape(caption)}</figcaption><div class="band">{r[language]}</div></figure>'
        for (caption, _, _), r in zip(CASES, renders)
    )
    for language in ("es", "en")
}
terminal = "".join(
    f'<figure><figcaption>{html.escape(caption)}</figcaption><pre class="term">'
    f'<span class="dim">{html.escape(r["text"])}</span>\n'
    f'<span class="rule"></span><span class="caret">&gt;</span> \n'
    f'<span class="rule"></span><span class="dim">  ? for shortcuts</span></pre></figure>'
    for (caption, _, _), r in zip(CASES, renders)
)

page = f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>usage-pace preview</title>
<style>
  :root {{ color-scheme: dark; }}
  body {{ background: #1a1a1a; color: #ececec; font: 14px system-ui, sans-serif; margin: 32px; }}
  h2 {{ font-weight: 600; font-size: 15px; margin: 32px 0 12px; }}
  figure {{ margin: 0 0 14px; }}
  figcaption {{ color: #8a8a8a; font-size: 12px; margin-bottom: 6px; }}
  .band {{ background: #262626; border-radius: 12px; padding: 10px 12px; width: 720px; }}
  .band svg {{ display: block; }}
  .term {{ background: #0d0d0d; border-radius: 8px; padding: 12px 14px; width: 720px; margin: 0;
           font: 13px/1.45 Menlo, "SF Mono", ui-monospace, monospace; color: #d4d4d4; }}
  .dim {{ color: #7c7c7c; }} .rule {{ display: block; border-top: 1px solid #3a3a3a; margin: 4px 0; }} .caret {{ color: #d4d4d4; }}
</style></head><body>
<h2>Desktop, español (pasá el mouse por los valores)</h2>{desktop["es"]}
<h2>Desktop, English</h2>{desktop["en"]}
<h2>Terminal</h2>{terminal}
</body></html>"""

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(page)
print(f"wrote {OUTPUT}")

# The README image: the four states, the yellow one with its tooltip showing.
rows = "".join(
    f'<div class="band{" show-tip" if index == 1 else ""}">{renders[index]["es"]}</div>' for index in range(4)
)
showcase = f"""<!doctype html><html><head><meta charset="utf-8"><style>
  :root {{ color-scheme: dark; }} html, body {{ margin: 0; background: #1a1a1a; }}
  body {{ padding: 16px; }} .band {{ background: #262626; border-radius: 12px; padding: 10px 12px; margin-bottom: 10px; }}
  .band svg {{ display: block; }} .show-tip #t0 {{ opacity: 1 !important; }}
</style></head><body>{rows}</body></html>"""
png = DOCS / "screenshot.png"
print(f"wrote {png}" if screenshot(showcase, png, 640, 216) else "skipped the screenshot: Chrome not found")
