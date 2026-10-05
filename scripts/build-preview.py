#!/usr/bin/env python3
"""Builds a static preview of the widget for desktop and terminal.

The plugin's own code renders each sample state: a temporary test prints the
desktop SVG and the terminal line, and this script lays them out in an HTML
page. Hover the desktop rows to see the tooltips.

    python3 scripts/build-preview.py [output.html]

It also renders docs/screenshot.png (the image in the README) with Chrome in
headless mode, when Chrome is installed.

The default output is docs/preview.html, kept in git as a visual reference:
regenerate it whenever the drawing or the texts change.
The terminal rows mock Claude Code's prompt; the line itself is the real one.
"""

import html
import json
import subprocess
import sys
from pathlib import Path

PLUGIN = Path(__file__).resolve().parent.parent
OUTPUT = Path(sys.argv[1]) if len(sys.argv) > 1 else PLUGIN / "docs" / "preview.html"
MARK = "@@PREVIEW@@"

# (caption, % used, hours until the reset)
CASES = [
    ("Verde: por debajo del ritmo", 12, 4.4),
    ("Amarillo: un poco por encima", 25, 4),
    ("Rojo: muy por encima", 60, 3),
    ("100%: límite alcanzado", 100, 1),
    ("Ventana reiniciada", 3, -1),
]

TEST = f"""
import {{ test }} from 'claude-code/testing'
import {{ computePace }} from './pace'
import {{ itemsFor, pillSvg, textLabel }} from './pill'

const HOUR = 3600_000
const NOW = 1_000_000_000_000
const CONFIG = {{ yellowMargin: 10, graceMinutes: 15 }}
const CASES = {json.dumps([[used, hours] for _, used, hours in CASES])}

test('preview', () => {{
  const out = CASES.map(([used, hours]) => {{
    const pace = computePace(used, NOW + hours * HOUR, NOW, CONFIG)
    const es = itemsFor(pace, 'es')
    return {{ es: pillSvg(es).source, en: pillSvg(itemsFor(pace, 'en')).source, text: textLabel(es) }}
  }})
  console.log('{MARK}' + JSON.stringify(out))
}})
"""

test_file = PLUGIN / "hooks" / "zz-preview.test.ts"
test_file.write_text(TEST)
try:
    run = subprocess.run(["claude", "plugin", "test", str(PLUGIN)], capture_output=True, text=True)
finally:
    test_file.unlink()

line = next((l for l in (run.stdout + run.stderr).splitlines() if MARK in l), None)
if line is None:
    sys.exit("preview test printed nothing:\n" + run.stdout + run.stderr)
renders = json.loads(line.split(MARK, 1)[1])

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

# The README image: green, yellow with its tooltip showing, red.
CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
if CHROME.exists():
    rows = "".join(
        f'<div class="band{" show-tip" if index == 1 else ""}">{renders[index]["es"]}</div>' for index in (0, 1, 2)
    )
    showcase = f"""<!doctype html><html><head><meta charset="utf-8"><style>
      :root {{ color-scheme: dark; }} html, body {{ margin: 0; background: #1a1a1a; }}
      body {{ padding: 16px; }} .band {{ background: #262626; border-radius: 12px; padding: 10px 12px; margin-bottom: 10px; }}
      .band svg {{ display: block; }} .show-tip #t0 {{ opacity: 1 !important; }}
    </style></head><body>{rows}</body></html>"""
    html_path = OUTPUT.parent / "screenshot.html"
    html_path.write_text(showcase)
    png = OUTPUT.parent / "screenshot.png"
    subprocess.run(
        [str(CHROME), "--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
         "--window-size=640,166", f"--screenshot={png}", html_path.as_uri()],
        capture_output=True,
    )
    html_path.unlink()
    print(f"wrote {png}" if png.exists() else "screenshot failed")
