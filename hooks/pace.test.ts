import { expect, test } from 'claude-code/testing'

import { WINDOW_MS, computePace, formatRemaining, formatWait } from './pace'

const HOUR = 60 * 60 * 1000
const NOW = 1_000_000_000_000
const CONFIG = { yellowMargin: 10, graceMinutes: 15 }

const at = (used: number, hoursLeft: number) =>
  computePace(used, NOW + hoursLeft * HOUR, NOW, CONFIG)

test('on pace with 4h left expects ~20%', () => {
  const pace = at(20, 4)
  expect(pace.kind).toBe('live')
  if (pace.kind === 'live') {
    expect(Math.round(pace.expected)).toBe(20)
    expect(pace.light).toBe('green')
  }
})

test('below pace is green, slightly above is yellow, well above is red', () => {
  expect(at(10, 4)).toMatchObject({ light: 'green' })
  expect(at(25, 4)).toMatchObject({ light: 'yellow' })
  expect(at(35, 4)).toMatchObject({ light: 'red' })
})

test('grace period caps the light at yellow', () => {
  const tenMinutesIn = WINDOW_MS / HOUR - 10 / 60
  expect(at(30, tenMinutesIn)).toMatchObject({ light: 'yellow' })
})

test('100% is red even in grace', () => {
  expect(at(100, 4.9)).toMatchObject({ light: 'red' })
})

test('a reading past its reset is stale', () => {
  expect(at(80, -0.1)).toEqual({ kind: 'stale' })
})

test('remaining time formatting', () => {
  expect(formatRemaining(2 * HOUR + 41 * 60000)).toBe('2h 41m')
  expect(formatRemaining(9 * 60000)).toBe('9m')
})

test('slowing down closes the gap at 100 points per window', () => {
  // 5 points over pace = 5% of 5h = 15 min.
  expect(at(25, 4)).toMatchObject({ light: 'yellow', slowDownMs: 15 * 60000 })
  expect(at(10, 4)).toMatchObject({ slowDownMs: 0 })
})

test('wait formatting', () => {
  expect(formatWait(15 * 60000)).toBe('15 min')
  expect(formatWait(60 * 60000)).toBe('1h')
  expect(formatWait(75 * 60000)).toBe('1h 15min')
})
