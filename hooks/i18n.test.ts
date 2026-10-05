import { expect, test } from 'claude-code/testing'

import { WEEK_MS, computePace } from './pace'
import { itemsFor } from './pill'

const HOUR = 60 * 60 * 1000
const NOW = 1_000_000_000_000
const CONFIG = { yellowMargin: 10, graceMinutes: 15 }

const tipsAt = (used: number, hoursLeft: number, language: 'es' | 'en') =>
  itemsFor(computePace(used, NOW + hoursLeft * HOUR, NOW, CONFIG), language).map(item => item.tip)

test('Spanish tips', () => {
  expect(tipsAt(10, 4, 'es')[0]).toBe('Usado de la sesión de 5 horas · venís bien')
  expect(tipsAt(25, 4, 'es')[0]).toBe('Usado de la sesión de 5 horas · cuidado (aflojá por 15 min)')
  expect(tipsAt(45, 4, 'es')[0]).toBe('Usado de la sesión de 5 horas · estás quemando tokens! (pisá el freno por 1h 15min)')
})

test('English tips', () => {
  expect(tipsAt(10, 4, 'en')[0]).toBe('Used of the 5-hour session · doing good')
  expect(tipsAt(25, 4, 'en')[0]).toBe('Used of the 5-hour session · look out (slow down for 15 min)')
  expect(tipsAt(45, 4, 'en')[0]).toBe("Used of the 5-hour session · you're burning tokens! (press the brakes for 1h 15min)")
  expect(tipsAt(100, 1, 'en')[0]).toBe('Used of the 5-hour session · limit reached')
})

const weekTipsAt = (used: number, hoursLeft: number, language: 'es' | 'en') =>
  itemsFor(null, language, computePace(used, NOW + hoursLeft * HOUR, NOW, CONFIG, WEEK_MS)).map(item => item.tip)

test('weekly tips carry the reset time', () => {
  expect(weekTipsAt(48, 76, 'es')).toEqual([
    'Usado de la semana, se reinicia en 3d 4h · venís bien',
    'Lo que correspondería haber usado esta semana',
  ])
  expect(weekTipsAt(57, 84, 'en')[0]).toBe('Used this week, resets in 3d 12h · look out (slow down for 11h 46min)')
})

test('the weekly group comes after the 5-hour one, prefixed', () => {
  const items = itemsFor(
    computePace(10, NOW + 4 * HOUR, NOW, CONFIG),
    'es',
    computePace(48, NOW + 76 * HOUR, NOW, CONFIG, WEEK_MS),
  )
  expect(items.map(item => item.prefix ?? '')).toEqual(['', '', '', '7d', ''])
})
