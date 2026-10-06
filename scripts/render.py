"""Shared helpers for the preview, screenshot and demo scripts.

`render_cases` runs the plugin's own drawing code through a temporary test, so
every image shows exactly what the mod draws.
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

PLUGIN = Path(__file__).resolve().parent.parent
DOCS = PLUGIN / "docs"
CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
MARK = "@@RENDER@@"

TEST = """
import {{ test }} from 'claude-code/testing'
import {{ WEEK_MS, computePace }} from './pace'
import {{ itemsFor, pillSvg, textLabel }} from './pill'

const HOUR = 3600_000
const NOW = 1_000_000_000_000
const CONFIG = {{ yellowMargin: 10, graceMinutes: 15 }}
const WEEK_CONFIG = {{ ...CONFIG, graceMinutes: 8 * 60 }}
const CASES = {cases}

test('render', () => {{
  const out = CASES.map(([used, hours, weekUsed, weekHours]) => {{
    const pace = computePace(used, NOW + hours * HOUR, NOW, CONFIG)
    const weekPace =
      weekUsed === undefined ? null : computePace(weekUsed, NOW + weekHours * HOUR, NOW, WEEK_CONFIG, WEEK_MS)
    const es = itemsFor(pace, 'es', weekPace)
    return {{ es: pillSvg(es).source, en: pillSvg(itemsFor(pace, 'en', weekPace)).source, text: textLabel(es) }}
  }})
  console.log('{mark}' + JSON.stringify(out))
}})
"""


def render_cases(cases: list[tuple[float, ...]]) -> list[dict]:
    """For each (% used, hours until the reset[, weekly % used, hours until the weekly reset]):
    the desktop SVG in es and en, and the terminal line."""
    test_file = PLUGIN / "hooks" / "zz-render.test.ts"
    test_file.write_text(TEST.format(cases=json.dumps([list(case) for case in cases]), mark=MARK))
    try:
        run = subprocess.run(["claude", "plugin", "test", str(PLUGIN)], capture_output=True, text=True)
    finally:
        test_file.unlink()
    line = next((l for l in (run.stdout + run.stderr).splitlines() if MARK in l), None)
    if line is None:
        sys.exit("render test printed nothing:\n" + run.stdout + run.stderr)
    return json.loads(line.split(MARK, 1)[1])


def screenshot(page: str, png: Path, width: int, height: int) -> bool:
    """Renders an HTML page to a PNG at 2x with headless Chrome; False when Chrome is missing."""
    if not CHROME.exists():
        return False
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as handle:
        handle.write(page)
        source = Path(handle.name)
    try:
        subprocess.run(
            [str(CHROME), "--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
             f"--window-size={width},{height}", f"--screenshot={png}", source.as_uri()],
            capture_output=True,
        )
    finally:
        source.unlink()
    return png.exists()
