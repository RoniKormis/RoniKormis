import { atom, read, update } from 'claude-code'
import type { Register, SessionRateLimit } from 'claude-code'

import type { Handoff, Usage } from '../types'
import { bar, isHandoffFile, mmss, osa, pillSvg, ringSvg, sh } from './util'


const usage = atom({ plugin: 'context-band', key: 'usage' } as const, {})
const sentAt = atom({ plugin: 'context-band', key: 'sentAt' } as const, null)
const now = atom({ plugin: 'context-band', key: 'now' } as const, 0)
const warned = atom({ plugin: 'context-band', key: 'warned' } as const, false)
const handoff = atom({ plugin: 'context-band', key: 'handoff' } as const, null as Handoff | null)

const TIMER_MS = 59 * 60 * 1000
const WARN = 70
const DANGER = 85

const pick = (limits: SessionRateLimit[], kind: string) =>
  limits.find(l => l.kind === kind)?.percentUsed

const color = (pct: number) => (pct >= DANGER ? 'error' : pct >= WARN ? 'warning' : 'success')

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
    const started = await next(e)
    const pending = (await $.store.get('pending')) as { path: string; cwd: string; at: number } | undefined
    if (pending && pending.cwd === (await $.session.cwd()) && (await $.clock.now()) - pending.at < 5 * 60 * 1000) {
      await $.store.delete('pending')
      $.clock.after(1500, async () => {
        await $.command.run({ command: 'remote-control' })
        await $.prompt.submit({
          text: `Read now.md first, then continue the work from the handoff at ${pending.path}`,
          asUser: true,
        })
      })
    }
    return started
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (e.tool === 'Write' && ran.isError !== true && isHandoffFile(e.file_path)) {
      const ho = await read($, handoff)
      if (ho?.isRunning) await update($, handoff, () => ({ ...ho, path: e.file_path }))
    }
    return ran
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    const ho = await read($, handoff)
    if (e.agentId !== undefined || !ho?.isRunning) return done
    await update($, handoff, () => null)
    if (!ho.path) {
      $.ui.toast('Handoff: no handoff .md file was written, nothing launched', { timeoutMs: 8000 })
      return done
    }
    const cwd = await $.session.cwd()
    await $.store.set('pending', { path: ho.path, cwd, at: await $.clock.now() })
    const script = `tell application "Terminal"\n  activate\n  do script "${osa(`cd ${sh(cwd)} && claude`)}"\nend tell`
    const r = await $.process.run(['osascript', '-e', script])
    $.ui.toast(r.exitCode === 0 ? 'Handoff: new Terminal window opened' : `Handoff: could not open Terminal (${r.stderr.trim()})`, { timeoutMs: 8000 })
    return done
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
    const { Box, Button, Text } = $.ui.resolve(e)
    const ho = await read($, handoff)
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

    const onHandoff = async () => {
      if ((await read($, handoff))?.isRunning || e.props.isWorking) return
      await update($, handoff, () => ({ isRunning: true }))
      await $.command.run({ command: 'handoff' })
    }
    const handoffLabel = ho?.isRunning ? 'Handing off…' : 'Handoff ↗'

    if (e.surface === 'desktop') {
      const { Svg } = $.ui.resolve(e)
      const pill = (label: string, pct?: number) => (
        <Box key={label} flexDirection="column">
          <Box flexDirection="row" gap={1}>
            <Text dimColor>{label}</Text>
            <Text bold>{pct === undefined ? '–' : `${Math.round(pct)}%`}</Text>
          </Box>
          <Svg source={pillSvg(pct ?? 0)} alt={`${label} ${pct === undefined ? 'unknown' : `${Math.round(pct)}%`}`} width={120} height={6} />
        </Box>
      )
      const ringColor = left === null ? '#9ca3af' : left <= 0 ? '#ef4444' : left <= 10 * 60 * 1000 ? '#f59e0b' : '#3b82f6'
      return (
        <Box flexDirection="row" alignItems="center" justifyContent="space-between" paddingX={1}>
          <Box flexDirection="row" alignItems="center" gap={3}>
            {pill('Context', u.context)}
            {pill('5h', u.fiveHour)}
            {pill('Week', u.week)}
            <Box flexDirection="row" alignItems="center" gap={1}>
              <Svg source={ringSvg(left === null ? 1 : left / TIMER_MS, ringColor)} alt="Idle timer" width={18} height={18} />
              <Text bold={left !== null}>{left === null ? '59:00' : left <= 0 ? 'expired' : mmss(left)}</Text>
            </Box>
          </Box>
          <Button key="handoff" label={handoffLabel} onPress={onHandoff} />
        </Box>
      )
    }

    return (
      <Box>
        {meter('Context', u.context)}
        {meter('5h', u.fiveHour)}
        {meter('Week', u.week)}
        <Text color={timerColor}>
          ⏱ {left === null ? '59:00' : left <= 0 ? '00:00 expired' : `${mmss(left)} left`}
        </Text>
        <Text>   </Text>
        <Button key="handoff" label={handoffLabel} onPress={onHandoff} />
      </Box>
    )
  })
}
