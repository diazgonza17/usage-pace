import { atom, read, update } from 'claude-code'
import type { Register, SessionRateLimit } from 'claude-code'

import type { Reading } from '../types'
import { toLanguage } from './i18n'
import { computePace } from './pace'
import { PILL_HEIGHT, itemsFor, pillSvg, textLabel } from './pill'

const fiveHour = atom({ plugin: 'usage-pace', key: 'fiveHour' } as const, null)

const toReading = (limits: readonly SessionRateLimit[]): Reading | null => {
  const window = limits.find(limit => limit.kind === 'five_hour')
  if (!window?.resetsAt) {
    return null
  }

  return { percentUsed: window.percentUsed, resetsAt: window.resetsAt }
}

export const register: Register = (on, options) => {
  const config = {
    yellowMargin: Number(options.yellowMargin ?? 10),
    graceMinutes: Number(options.graceMinutes ?? 15),
  }
  const language = toLanguage(options.language)

  on('session.start', async ($, e, next) => {
    const { rateLimits } = await $.session.usage()
    const reading = toReading(rateLimits)
    if (reading) {
      await update($, fiveHour, () => reading)
    }
    // Keeps the countdown and the expected % fresh between measurements.
    $.clock.every(60_000, () => $.ui.invalidate('ui.render'))

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) {
      const reading = toReading(e.rateLimits)
      await update($, fiveHour, () => reading)
    }

    return next(e)
  })

  // One row above the prompt; on desktop an SVG so each value carries a native tooltip.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const reading = await read($, fiveHour)
    if (e.props.hasSurvey || reading === null) {
      return next(e)
    }

    const pace = computePace(reading.percentUsed, Date.parse(reading.resetsAt), await $.clock.now(), config)
    const items = itemsFor(pace, language)

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
