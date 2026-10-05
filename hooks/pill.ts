import { STRINGS } from './i18n'
import type { Language, Strings } from './i18n'
import { formatRemaining, formatWait } from './pace'
import type { Light, Pace } from './pace'
import { SPRITES } from './sprites'

export type Icon = 'pace' | 'target' | 'clock' | 'refresh'

export type Item = { icon: Icon; label: string; tip: string; light?: Light; used?: number }

// The second half of the progress tip; off pace, how long to ease off to be
// green again (always before the reset while under 100%).
const rhythm = (pace: Extract<Pace, { kind: 'live' }>, text: Strings): string => {
  if (pace.used >= 100) return text.limit
  if (pace.light === 'green') return text.doingGood

  const wait = formatWait(pace.slowDownMs)

  return pace.light === 'yellow' ? text.lookOut(wait) : text.burning(wait)
}

export const itemsFor = (pace: Pace, language: Language): Item[] => {
  const text = STRINGS[language]
  if (pace.kind === 'stale') {
    return [{ icon: 'refresh', label: '', tip: text.stale }]
  }

  return [
    {
      icon: 'pace',
      label: `${Math.round(pace.used)}%`,
      tip: `${text.used} · ${rhythm(pace, text)}`,
      light: pace.light,
      used: pace.used,
    },
    { icon: 'target', label: `${Math.round(pace.expected)}%`, tip: text.expected },
    { icon: 'clock', label: formatRemaining(pace.remainingMs), tip: text.reset },
  ]
}

const EMOJI: Record<Light, string> = { green: '🟢', yellow: '🟡', red: '🔴' }

// The terminal draws text only: each icon as its emoji.
export const textLabel = (items: Item[]): string =>
  items
    .map(item => {
      const emoji = item.icon === 'pace' ? EMOJI[item.light ?? 'green'] : { target: '🎯', clock: '⏳', refresh: '🔄' }[item.icon]
      return item.label === '' ? emoji : `${emoji} ${item.label}`
    })
    .join(' ')

const FILL: Record<Light, string> = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' }

const HEIGHT = 20
const MID = HEIGHT / 2
const ICON = 14
const ICON_GAP = 5
const ITEM_GAP = 14
const LABEL_SIZE = 13
const TIP_SIZE = 12
const TIP_PAD = 8
const FONT = 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'

// Advance widths of the macOS system font at 12px, measured in the desktop's
// engine; other sizes scale. Labels and tips also get `textLength`, so a
// slightly different font keeps the layout exact.
const WIDTHS_12: Record<string, number> = {
  ...Object.fromEntries('0123456789'.split('').map((d, i) => [d, [7.56, 5.57, 7.24, 7.52, 7.73, 7.42, 7.64, 6.84, 7.66, 7.64][i]])),
  a: 6.63, b: 7.38, c: 6.72, d: 7.38, e: 6.86, f: 4.34, g: 7.31, h: 7.06, i: 2.97, j: 2.96, k: 6.52, l: 3.04,
  m: 10.45, n: 7.01, o: 7.09, p: 7.33, q: 7.31, r: 4.57, s: 6.28, t: 4.36, u: 7.01, v: 6.51, w: 9.3, x: 6.3,
  y: 6.52, z: 6.47, A: 8.09, L: 6.82, T: 7.61, U: 8.85, W: 11.62, "'": 2.6, '-': 5.66, '!': 3.73, ' ': 3.2, '.': 3.56, ',': 3.56, ';': 3.56, ':': 3.56,
  '%': 11.11, '·': 3.56, '(': 4.59, ')': 4.59, '+': 7.56, á: 6.63, é: 6.86, í: 2.97, ó: 7.09, ú: 7.01, ñ: 7.01,
}

const textWidth = (text: string, size: number) =>
  Array.from(text).reduce((sum, char) => sum + (WIDTHS_12[char] ?? 7), 0) * (size / 12)

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const iconSvg = (item: Item, x: number): string => {
  const cx = x + ICON / 2
  const r = 5.5
  switch (item.icon) {
    case 'pace': {
      const circumference = 2 * Math.PI * r
      const filled = Math.max(1, (Math.min(100, item.used ?? 0) / 100) * circumference)
      return (
        `<circle class="track" cx="${cx}" cy="${MID}" r="${r}" fill="none" stroke-width="2.4"/>` +
        `<circle cx="${cx}" cy="${MID}" r="${r}" fill="none" stroke="${FILL[item.light ?? 'green']}" stroke-width="2.4" ` +
        `stroke-linecap="round" stroke-dasharray="${filled.toFixed(2)} ${circumference.toFixed(2)}" transform="rotate(-90 ${cx} ${MID})"/>`
      )
    }
    case 'target':
      // A target with an arrow stuck in its centre, fletching up and to the right.
      return (
        `<circle class="line" cx="${cx}" cy="${MID}" r="${r}" fill="none" stroke-width="1.3"/>` +
        `<circle class="line" cx="${cx}" cy="${MID}" r="2.5" fill="none" stroke-width="1.3"/>` +
        `<path class="line" d="M${cx} ${MID}L${cx + 6.2} ${MID - 6.2}" fill="none" stroke-width="1.4" stroke-linecap="round"/>` +
        `<path class="line" d="M${cx + 4.4} ${MID - 7}l1.8 0.8l0.8 1.8M${cx + 3.2} ${MID - 5.8}l1.8 0.8l0.8 1.8" fill="none" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<circle class="dot" cx="${cx}" cy="${MID}" r="1.1"/>`
      )
    case 'clock':
      return (
        `<circle class="line" cx="${cx}" cy="${MID}" r="${r}" fill="none" stroke-width="1.3"/>` +
        `<path class="line" d="M${cx} ${MID - 3.2}V${MID}l2.3 1.4" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`
      )
    case 'refresh':
      return (
        `<path class="line" d="M${cx + 4.6} ${MID - 2.4}A5 5 0 1 0 ${cx + 5} ${MID + 0.6}" fill="none" stroke-width="1.3" stroke-linecap="round"/>` +
        `<path class="line" d="M${cx + 4.9} ${MID - 5.2}V${MID - 2.2}H${cx + 1.9}" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`
      )
  }
}

const ISAAC_GAP = 5

// Isaac reacts to the pace: thumbs up, idle, screaming, or flat on the floor at
// the limit. Drawn as vector pixels (the desktop strips embedded images) at half
// their native size, so a 2x screen shows each sprite pixel crisp.
const isaacSvg = (item: Item, x: number): { markup: string; width: number } => {
  const sprite = (item.used ?? 0) >= 100 ? SPRITES.limit : SPRITES[item.light ?? 'green']
  const width = sprite.width / 2
  const y = MID - sprite.height / 4
  const paths = sprite.paths.map(([fill, d]) => `<path fill="${fill}" d="${d}"/>`).join('')
  const markup = `<g transform="translate(${x} ${y}) scale(0.5)" shape-rendering="crispEdges">${paths}</g>`

  return { markup, width }
}

const STYLE = [
  ':root{color-scheme:light dark;background:transparent}',
  `text{font-family:${FONT}}`,
  '.label{font-size:13px;fill:#6b6b6b}.line{stroke:#6b6b6b}.dot{fill:#6b6b6b}.track{stroke:#d9d9d9}',
  '.item{cursor:default}.item:hover .label{fill:#1a1a1a}.item:hover .line{stroke:#1a1a1a}.item:hover .dot{fill:#1a1a1a}',
  '.tip{opacity:0;pointer-events:none;transition:opacity 80ms}',
  '.tip rect,.tip path{fill:#fff;stroke:#d4d4d4}.tip text{font-size:12px;fill:#1a1a1a}',
  '@media (prefers-color-scheme:dark){',
  '.label{fill:#9b9b9b}.line{stroke:#9b9b9b}.dot{fill:#9b9b9b}.track{stroke:#3d3d3d}',
  '.item:hover .label{fill:#ececec}.item:hover .line{stroke:#ececec}.item:hover .dot{fill:#ececec}',
  '.tip rect,.tip path{fill:#2b2b2b;stroke:#454545}.tip text{fill:#ececec}}',
].join('')

// One SVG for the desktop. Each value is a hover group; its tip is a sibling
// shown by CSS the moment the pointer is on it, to the right of the values
// (the frame is one row tall, so nothing can float above it).
export const pillSvg = (items: Item[]): { source: string; width: number } => {
  let x = 1
  const groups: string[] = []
  for (const [index, item] of items.entries()) {
    const start = x
    const isaac = item.icon === 'pace' ? isaacSvg(item, x) : null
    if (isaac) {
      x += isaac.width + ISAAC_GAP
    }
    const labelWidth = item.label === '' ? 0 : textWidth(item.label, LABEL_SIZE)
    const label =
      labelWidth > 0
        ? `<text class="label" x="${x + ICON + ICON_GAP}" y="${MID}" dominant-baseline="central" textLength="${labelWidth.toFixed(2)}" lengthAdjust="spacing">${escape(item.label)}</text>`
        : ''
    const end = x + ICON + (labelWidth > 0 ? ICON_GAP + labelWidth : 0)
    groups.push(
      `<g class="item" id="i${index}"><rect x="${start - 3}" y="0" width="${end - start + 6}" height="${HEIGHT}" fill="transparent"/>${isaac?.markup ?? ''}${iconSvg(item, x)}${label}</g>`,
    )
    x = end + ITEM_GAP
  }

  const tipX = x - ITEM_GAP + 10
  let widest = 0
  const tips = items.map((item, index) => {
    const textW = textWidth(item.tip, TIP_SIZE)
    const boxW = textW + TIP_PAD * 2
    widest = Math.max(widest, boxW)
    const caret = `<path d="M${tipX + 0.5} ${MID - 4}L${tipX - 4} ${MID}L${tipX + 0.5} ${MID + 4}" stroke-width="1"/>`
    return (
      `<g class="tip" id="t${index}">` +
      `<rect x="${tipX}" y="1" width="${boxW.toFixed(2)}" height="${HEIGHT - 2}" rx="5" stroke-width="1"/>${caret}` +
      `<text x="${tipX + TIP_PAD}" y="${MID}" dominant-baseline="central" textLength="${textW.toFixed(2)}" lengthAdjust="spacing">${escape(item.tip)}</text>` +
      `</g>`
    )
  })

  const reveal = items.map((_, index) => `#i${index}:hover~#t${index}`).join(',')
  const width = Math.ceil(tipX + widest + 2)
  const style = `${STYLE}${reveal}{opacity:1}`
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${HEIGHT}" viewBox="0 0 ${width} ${HEIGHT}"><style>${style}</style>${groups.join('')}${tips.join('')}</svg>`

  return { source, width }
}

export const PILL_HEIGHT = HEIGHT
