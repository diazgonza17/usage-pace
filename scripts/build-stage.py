#!/usr/bin/env python3
"""Builds docs/stage.html: a page to screen-record the widget.

It cycles through the four states every 2 seconds above a replica of the
Claude Code prompt. The tooltips are the real ones: hover the values while
recording. The SVGs come from the plugin's own drawing code.

    python3 scripts/build-stage.py

Open docs/stage.html in a browser. Keys: space pauses or resumes, ← and →
step through the states, L switches the language. `?lang=es` starts in
Spanish, `?ms=1500` changes the interval.
"""

import json

from render import DOCS, render_cases

# (% used, hours until the reset): green, yellow, red, limit.
STATES = [(12, 4.4), (25, 4), (60, 3), (100, 1)]

renders = render_cases(STATES)
svgs = {language: [render[language] for render in renders] for language in ("en", "es")}

RETURN = (
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" '
    'stroke-linecap="round" stroke-linejoin="round"><path d="M13 3v5.5a2 2 0 0 1-2 2H3.5"/><path d="M6 7.5l-3 3 3 3"/></svg>'
)

page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>usage-pace stage</title>
<style>
  :root {{ color-scheme: dark; }}
  html, body {{ margin: 0; height: 100%; background: #1a1a1a; }}
  body {{ display: flex; align-items: flex-end; justify-content: center; padding: 0 24px 48px;
          box-sizing: border-box; font: 15px system-ui, -apple-system, BlinkMacSystemFont, sans-serif; color: #ececec; }}
  .stack {{ width: min(760px, 100%); }}
  .band {{ background: #262626; border-radius: 14px; padding: 11px 12px; margin-bottom: 8px; }}
  .band svg {{ display: block; }}
  .prompt {{ display: flex; align-items: center; gap: 10px; border: 1px solid #3a3a3a; border-radius: 14px;
             background: #212121; padding: 0 14px; height: 50px; }}
  .prompt:focus-within {{ border-color: #4a4a4a; }}
  .prompt input {{ flex: 1; background: none; border: 0; outline: 0; color: #ececec; font: inherit; }}
  .prompt input::placeholder {{ color: #7a7a7a; }}
  .prompt .send {{ color: #8a8a8a; display: flex; }}
  .footer {{ display: flex; justify-content: space-between; color: #a8a8a8; font-size: 14px; padding: 12px 12px 0; }}
  .footer .left {{ display: flex; gap: 16px; align-items: center; }}
  .footer .right {{ display: flex; gap: 18px; }}
  .hint {{ position: fixed; top: 12px; right: 16px; color: #555; font-size: 12px; }}
</style></head><body>
<div class="hint">space pause · ← → step · L language</div>
<div class="stack">
  <div class="band" id="band"></div>
  <div class="prompt"><input placeholder="Type / for commands" autofocus><span class="send">{RETURN}</span></div>
  <div class="footer">
    <div class="left"><span>+</span><span>Accept edits</span></div>
    <div class="right"><span>Opus 5.5</span><span>High</span></div>
  </div>
</div>
<script>
  const SVGS = {json.dumps(svgs)};
  const params = new URLSearchParams(location.search);
  let language = params.get('lang') === 'es' ? 'es' : 'en';
  const interval = Number(params.get('ms')) || 2000;
  const band = document.getElementById('band');
  let state = 0, timer = null;

  const draw = () => {{ band.innerHTML = SVGS[language][state]; }};
  const step = by => {{ state = (state + by + 4) % 4; draw(); }};
  const play = () => {{ timer = setInterval(() => step(1), interval); }};
  const pause = () => {{ clearInterval(timer); timer = null; }};

  document.addEventListener('keydown', event => {{
    if (event.target.tagName === 'INPUT' && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.key === ' ') {{ event.preventDefault(); timer ? pause() : play(); }}
    if (event.key === 'ArrowRight') {{ pause(); step(1); }}
    if (event.key === 'ArrowLeft') {{ pause(); step(-1); }}
    if (event.key === 'l' || event.key === 'L') {{ language = language === 'en' ? 'es' : 'en'; draw(); }}
  }});

  draw();
  play();
</script>
</body></html>"""

out = DOCS / "stage.html"
out.write_text(page)
print(f"wrote {out}")
