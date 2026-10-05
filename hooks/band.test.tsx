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
