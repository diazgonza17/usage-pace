import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { SessionRateLimit } from 'claude-code'

const NOW = Date.parse('2026-10-04T12:00:00Z')
const HOUR = 60 * 60 * 1000

const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100 },
} as const

const measure = (rateLimits: SessionRateLimit[]) => ({
  context: { window: 200_000 },
  rateLimits,
  changed: ['rateLimits' as const],
})

const seed = async ($: Engine) => {
  const resetsAt = new Date(NOW + 4 * HOUR).toISOString()
  await $.session.measure(measure([{ kind: 'five_hour', percentUsed: 34, resetsAt }]))
}

const seedWeek = async ($: Engine, percentUsed: number, hoursLeft: number) => {
  await $.session.measure(
    measure([
      { kind: 'five_hour', percentUsed: 34, resetsAt: new Date(NOW + 4 * HOUR).toISOString() },
      { kind: 'seven_day', percentUsed, resetsAt: new Date(NOW + hoursLeft * HOUR).toISOString() },
    ]),
  )
}

test('desktop draws an interactive SVG with a tooltip per value', async ($, on) => {
  mock.clock(on, { now: NOW })
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await seed($)

  const ui = await $.ui.mount({ plugin: 'usage-pace', surface: 'desktop', ...BAND })
  expect(await ui.find({ type: 'Svg' })).toBeDefined()
  await ui.unmount()
})

test('terminal draws one dim line with emoji', async ($, on) => {
  mock.clock(on, { now: NOW })
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await seed($)

  const ui = await $.ui.mount({ plugin: 'usage-pace', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /🔴 34% 🎯 20% ⏳ 4h 00m/ })).toBeDefined()
  await ui.unmount()
})

test('without a five_hour reading the engine draws the band', async ($, on) => {
  mock.clock(on, { now: NOW })
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine band</Text>
  })

  const ui = await $.ui.mount({ plugin: 'usage-pace', surface: 'desktop', ...BAND })
  expect(await ui.find({ type: 'Text', text: 'engine band' })).toBeDefined()
  await ui.unmount()
})

test('terminal shows the weekly group after the 5-hour one', async ($, on) => {
  mock.clock(on, { now: NOW })
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await seedWeek($, 48, 76)

  const ui = await $.ui.mount({ plugin: 'usage-pace', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /🔴 34% 🎯 20% ⏳ 4h 00m · 7d 🟢 48% 🎯 55%/ })).toBeDefined()
  await ui.unmount()
})

test('desktop draws the weekly prefix in the SVG', async ($, on) => {
  mock.clock(on, { now: NOW })
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await seedWeek($, 48, 76)

  const ui = await $.ui.mount({ plugin: 'usage-pace', surface: 'desktop', ...BAND })
  const svg = await ui.find({ type: 'Svg' })
  expect(String(svg?.props.source)).toContain('>7d</text>')
  expect(String(svg?.props.alt)).toContain('Usado de la semana, se reinicia en 3d 4h')
  await ui.unmount()
})

test('with showWeekly off the band shows only the 5-hour group', { options: { showWeekly: false } }, async ($, on) => {
  mock.clock(on, { now: NOW })
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  await seedWeek($, 48, 76)

  const ui = await $.ui.mount({ plugin: 'usage-pace', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /^🔴 34% 🎯 20% ⏳ 4h 00m$/ })).toBeDefined()
  await ui.unmount()
})

test('weeklyGraceHours keeps the week out of red early on', { options: { weeklyGraceHours: 12 } }, async ($, on) => {
  mock.clock(on, { now: NOW })
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  // 10 hours into the week (expected ~6%), 20% used: red past an 8h grace, yellow within 12h.
  await seedWeek($, 20, 158)

  const ui = await $.ui.mount({ plugin: 'usage-pace', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /7d 🟡 20%/ })).toBeDefined()
  await ui.unmount()
})
