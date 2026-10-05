import { expect, test } from 'claude-code/testing'

import { computePace } from './pace'
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
