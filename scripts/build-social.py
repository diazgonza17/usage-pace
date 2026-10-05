#!/usr/bin/env python3
"""Builds docs/social-preview.png (1280×640), the image GitHub shows when the
repo link is shared. Upload it in the repo's Settings → Social preview.

    python3 scripts/build-social.py
"""

import base64

from render import DOCS, PLUGIN, render_cases, screenshot

# (% used, hours until the reset): green, yellow, red, limit.
STATES = [(12, 4.4), (25, 4), (60, 3), (100, 1)]

renders = render_cases(STATES)
isaac = base64.b64encode((PLUGIN / "assets" / "isaac" / "green.png").read_bytes()).decode()

# The yellow row shows its tooltip; each row is cut to its own width by script.
rows = "".join(
    f'<div class="band{" show-tip" if index == 1 else ""}">{render["en"]}</div>' for index, render in enumerate(renders)
)

page = f"""<!doctype html><html><head><meta charset="utf-8"><style>
  :root {{ color-scheme: dark; }}
  html, body {{ margin: 0; width: 640px; height: 320px; overflow: hidden; }}
  body {{ background: radial-gradient(circle at 85% 20%, #2a2a2a 0, #181818 55%); color: #ececec;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; position: relative; }}
  .text {{ position: absolute; left: 28px; top: 24px; }}
  h1 {{ margin: 0; font-size: 34px; font-weight: 700; letter-spacing: -0.5px; }}
  p {{ margin: 4px 0 0; font-size: 14px; color: #a0a0a0; }}
  .install {{ position: absolute; right: 28px; bottom: 24px; font: 12px ui-monospace, Menlo, monospace;
              color: #9b9b9b; background: #232323; border: 1px solid #333; border-radius: 8px; padding: 6px 10px; }}
  .isaac {{ position: absolute; right: 36px; top: 18px; width: 88px; image-rendering: pixelated; }}
  .rows {{ position: absolute; left: 28px; bottom: 24px; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; zoom: 0.92; }}
  .band {{ background: #262626; border-radius: 12px; padding: 10px 12px; overflow: hidden; }}
  .band svg {{ display: block; }}
  .show-tip #t0 {{ opacity: 1 !important; }}
</style></head><body>
  <div class="text">
    <h1>usage-pace</h1>
    <p>Know if you'll hit your Claude limit before the reset.</p>
  </div>
  <img class="isaac" src="data:image/png;base64,{isaac}" alt="">
  <div class="rows">{rows}</div>
  <div class="install">/plugin install usage-pace@gontzalo</div>
  <script>
    for (const band of document.querySelectorAll('.band')) {{
      const svg = band.querySelector('svg');
      const items = svg.querySelectorAll('.item rect');
      const shown = band.classList.contains('show-tip') ? svg.querySelector('#t0 rect') : items[items.length - 1];
      const right = Number(shown.getAttribute('x')) + Number(shown.getAttribute('width'));
      svg.setAttribute('viewBox', `0 0 ${{Math.ceil(right + 2)}} ${{svg.getAttribute('height')}}`);
      svg.setAttribute('width', Math.ceil(right + 2));
    }}
  </script>
</body></html>"""

png = DOCS / "social-preview.png"
print(f"wrote {png}" if screenshot(page, png, 640, 320) else "Chrome not found")
