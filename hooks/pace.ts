export const WINDOW_MS = 5 * 60 * 60 * 1000

export type Light = 'green' | 'yellow' | 'red'

export type Pace =
  | { kind: 'stale' }
  | {
      kind: 'live'
      light: Light
      used: number
      expected: number
      remainingMs: number
      /** How long without using Claude until the pace is green again. */
      slowDownMs: number
    }

export type PaceConfig = { yellowMargin: number; graceMinutes: number }

// Expected usage grows linearly over the window: with 4h left of 5h, ~20% is on pace.
export const computePace = (
  used: number,
  resetsAtMs: number,
  nowMs: number,
  { yellowMargin, graceMinutes }: PaceConfig,
): Pace => {
  const remainingMs = resetsAtMs - nowMs
  if (remainingMs <= 0) {
    return { kind: 'stale' }
  }

  const elapsedMs = Math.max(0, WINDOW_MS - remainingMs)
  const expected = (elapsedMs / WINDOW_MS) * 100
  const delta = used - expected
  const isInGrace = elapsedMs < graceMinutes * 60 * 1000

  let light: Light = 'green'
  if (used >= 100) {
    light = 'red'
  } else if (delta > yellowMargin && !isInGrace) {
    light = 'red'
  } else if (delta > 0) {
    light = 'yellow'
  }

  // Paused, `used` stays put while `expected` keeps growing: the gap closes at
  // 100 points per window.
  const slowDownMs = Math.max(0, (delta / 100) * WINDOW_MS)

  return { kind: 'live', light, used, expected, remainingMs, slowDownMs }
}

export const formatRemaining = (ms: number): string => {
  const minutes = Math.ceil(ms / 60000)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return hours > 0 ? `${hours}h ${String(rest).padStart(2, '0')}m` : `${rest}m`
}

// "15 min", "1h", "1h 15min": the wait a tip suggests.
export const formatWait = (ms: number): string => {
  const minutes = Math.max(1, Math.ceil(ms / 60000))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}min`
}
