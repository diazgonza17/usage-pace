import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

import type { Reading } from '../types'
import { toLanguage } from './i18n'
import { WEEK_MS, computePace } from './pace'
import { PILL_HEIGHT, itemsFor, pillSvg, textLabel } from './pill'

const fiveHour = atom({ plugin: 'usage-pace', key: 'fiveHour' } as const, null)
const sevenDay = atom({ plugin: 'usage-pace', key: 'sevenDay' } as const, null)

const toReading = (limits: readonly SessionRateLimit[], kind: string): Reading | null => {
  const window = limits.find(limit => limit.kind === kind)
  if (!window?.resetsAt) {
    return null
  }

  return { percentUsed: window.percentUsed, resetsAt: window.resetsAt }
}

const saveReadings = async ($: EngineInterface, limits: readonly SessionRateLimit[]) => {
  const reading = toReading(limits, 'five_hour')
  const weekReading = toReading(limits, 'seven_day')
  await update($, fiveHour, () => reading)
  await update($, sevenDay, () => weekReading)
}

export const register: Register = (on, options) => {
  const config = {
    yellowMargin: Number(options.yellowMargin ?? 10),
    graceMinutes: Number(options.graceMinutes ?? 15),
  }
  const weekConfig = { ...config, graceMinutes: Number(options.weeklyGraceHours ?? 8) * 60 }
  const showWeekly = Boolean(options.showWeekly ?? true)
  const language = toLanguage(options.language)

  on('session.start', async ($, e, next) => {
    const { rateLimits } = await $.session.usage()
    if (rateLimits.length > 0) {
      await saveReadings($, rateLimits)
    }
    // Keeps the countdown and the expected % fresh between measurements.
    $.clock.every(60_000, () => $.ui.invalidate('ui.render'))

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      await saveReadings($, e.rateLimits)
    }

    return next(e)
  })

  // One row above the prompt; on desktop an SVG so each value carries a native tooltip.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const reading = await read($, fiveHour)
    const weekReading = showWeekly ? await read($, sevenDay) : null
    if (e.props.hasSurvey || (reading === null && weekReading === null)) {
      return next(e)
    }

    const now = await $.clock.now()
    const pace = reading && computePace(reading.percentUsed, Date.parse(reading.resetsAt), now, config)
    const weekPace =
      weekReading && computePace(weekReading.percentUsed, Date.parse(weekReading.resetsAt), now, weekConfig, WEEK_MS)
    const items = itemsFor(pace, language, weekPace)

    if (e.surface === 'desktop') {
      const { Box, Svg } = $.ui.resolve(e)
      const { source, width } = pillSvg(items)
      const alt = items.map(item => item.tip).join('. ')

      return (
        <Box flexDirection="row">
          <Svg source={source} alt={alt} width={width} height={PILL_HEIGHT} isInteractive />
        </Box>
      )
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row">
        <Text dimColor>{textLabel(items)}</Text>
      </Box>
    )
  })
}
