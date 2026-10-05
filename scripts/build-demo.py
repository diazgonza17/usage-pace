#!/usr/bin/env python3
"""Builds docs/demo.gif: the four states with their tooltips, in English.

Each frame is the widget as the plugin draws it, above a mock of the prompt,
rendered with headless Chrome and joined into a looping GIF (needs Pillow):

    python3 scripts/build-demo.py
"""

import tempfile
from pathlib import Path

from PIL import Image

from render import DOCS, render_cases, screenshot

WIDTH, HEIGHT = 720, 120

# (% used, hours until the reset)
STATES = [(12, 4.4), (25, 4), (60, 3), (100, 1)]

# (state, hovered value or None, ms): rest, then the tooltips. The first state
# shows all three tooltips; the rest show the pace one, which changes.
FRAMES = [
    (0, None, 1200), (0, 0, 2200), (0, 1, 1800), (0, 2, 1600),
    (1, None, 1000), (1, 0, 2600),
    (2, None, 1000), (2, 0, 2800),
    (3, None, 1000), (3, 0, 2400),
]

CURSOR = (
    '<svg id="cursor" width="16" height="22" viewBox="0 0 16 22" xmlns="http://www.w3.org/2000/svg">'
    '<path d="M1 1v17l4.6-4.4 3 6.6 2.8-1.3-3-6.4H15z" fill="#fff" stroke="#000" stroke-width="1.2" '
    'stroke-linejoin="round"/></svg>'
)


def page(svg: str, hovered: int | None) -> str:
    hover = (
        f".band #i{hovered} .label {{ fill: #ececec !important; }} .band #i{hovered} .line {{ stroke: #ececec !important; }}"
        f".band #i{hovered} .dot {{ fill: #ececec !important; }} .band #t{hovered} {{ opacity: 1 !important; }}"
        if hovered is not None
        else ""
    )
    # The cursor points at the hovered value's icon (the ring, past Isaac, for the
    # first one), or rests in the prompt when nothing is hovered.
    place = (
        f"const box = document.querySelector('.band #i{hovered} rect').getBoundingClientRect();"
        f"cursor.style.left = (box.left + {25 if hovered == 0 else 9}) + 'px'; cursor.style.top = (box.top + 13) + 'px';"
        if hovered is not None
        else "cursor.style.left = '420px'; cursor.style.top = '76px';"
    )
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
  :root {{ color-scheme: dark; }}
  html, body {{ margin: 0; background: #1a1a1a; font: 15px system-ui, -apple-system, sans-serif; }}
  body {{ padding: 14px 16px; }}
  .band {{ background: #262626; border-radius: 14px 14px 0 0; padding: 10px 12px; }}
  .band svg {{ display: block; }}
  .prompt {{ border: 1px solid #3a3a3a; border-radius: 12px; background: #1f1f1f; color: #7a7a7a;
             padding: 13px 14px; margin-top: 6px; }}
  #cursor {{ position: absolute; }}
  {hover}
</style></head><body>
  <div class="band">{svg}</div>
  <div class="prompt">Ask Claude anything…</div>
  {CURSOR}
  <script>const cursor = document.getElementById('cursor'); {place}</script>
</body></html>"""


renders = render_cases(STATES)
images = []
with tempfile.TemporaryDirectory() as folder:
    for index, (state, hovered, _) in enumerate(FRAMES):
        png = Path(folder) / f"{index}.png"
        if not screenshot(page(renders[state]["en"], hovered), png, WIDTH, HEIGHT):
            raise SystemExit("Chrome not found")
        images.append(Image.open(png).convert("RGB").quantize(colors=128, method=Image.Quantize.MEDIANCUT))

gif = DOCS / "demo.gif"
images[0].save(
    gif, save_all=True, append_images=images[1:], duration=[ms for _, _, ms in FRAMES], loop=0, optimize=True
)
print(f"wrote {gif} ({gif.stat().st_size // 1024} KB)")
