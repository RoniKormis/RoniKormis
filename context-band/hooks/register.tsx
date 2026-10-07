import { atom, read, update } from 'claude-code'
import type { Register, SessionRateLimit } from 'claude-code'

import type { Usage } from '../types'


const usage = atom({ plugin: 'context-band', key: 'usage' } as const, {})
const sentAt = atom({ plugin: 'context-band', key: 'sentAt' } as const, null)
const now = atom({ plugin: 'context-band', key: 'now' } as const, 0)
const warned = atom({ plugin: 'context-band', key: 'warned' } as const, false)

const TIMER_MS = 59 * 60 * 1000
const WARN = 70
const DANGER = 85

const pick = (limits: SessionRateLimit[], kind: string) =>
  limits.find(l => l.kind === kind)?.percentUsed

const color = (pct: number) => (pct >= DANGER ? 'error' : pct >= WARN ? 'warning' : 'success')

export const bar = (pct: number, cells = 10) => {
  const full = Math.round((Math.min(100, Math.max(0, pct)) / 100) * cells)
  return '█'.repeat(full) + '░'.repeat(cells - full)
}

export const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await update($, now, () => 0)
    $.clock.every(1000, async () => {
      const t = await $.clock.now()
      await update($, now, () => t)
      const sent = await read($, sentAt)
      if (sent !== null) {
        const left = TIMER_MS - (t - sent)
        $.ui.status(`ctx ${(await read($, usage)).context ?? '–'}% · ⏱ ${mmss(left)}`)
        if (left <= 0 && left > -1000) $.ui.toast('⏱ 59 min since your last message')
      }
    })
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    const t = await $.clock.now()
    await update($, sentAt, () => t)
    await update($, now, () => t)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.measure', async ($, e, next) => {
    const u: Usage = {
      context: e.context.percent,
      fiveHour: pick(e.rateLimits, 'five_hour'),
      week: pick(e.rateLimits, 'seven_day'),
    }
    await update($, usage, () => u)
    const pct = u.context ?? 0
    if (pct >= WARN && !(await read($, warned))) {
      $.ui.toast(`Context at ${pct}% — consider /compact or a fresh session`, { timeoutMs: 8000 })
      await update($, warned, () => true)
    } else if (pct < WARN) {
      await update($, warned, () => false)
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const u = await read($, usage)
    const sent = await read($, sentAt)
    const t = await read($, now)

    const meter = (label: string, pct?: number) => (
      <Box key={label}>
        <Text dimColor>{label} </Text>
        {pct === undefined ? (
          <Text dimColor>–</Text>
        ) : (
          <Text color={color(pct)}>
            ▕{bar(pct)}▏ {Math.round(pct)}%
          </Text>
        )}
        <Text dimColor>   ·   </Text>
      </Box>
    )

    const left = sent === null ? null : TIMER_MS - (t - sent)
    const timerColor = left === null ? 'subtle' : left <= 0 ? 'error' : left <= 10 * 60 * 1000 ? 'warning' : 'text'

    return (
      <Box>
        {meter('Context', u.context)}
        {meter('5h', u.fiveHour)}
        {meter('Week', u.week)}
        <Text color={timerColor}>
          ⏱ {left === null ? '59:00' : left <= 0 ? '00:00 expired' : `${mmss(left)} left`}
        </Text>
      </Box>
    )
  })
}
