import { expect, test } from 'claude-code/testing'

import { bar, mmss } from '../hooks/util'

test('bar and timer format', async () => {
  expect(bar(0)).toBe('░░░░░░░░░░')
  expect(bar(62)).toBe('██████░░░░')
  expect(bar(120)).toBe('██████████')
  expect(mmss(59 * 60 * 1000)).toBe('59:00')
  expect(mmss(-5)).toBe('00:00')
})

test('toasts once when context crosses 70%', async ($, on) => {
  const toasts: string[] = []
  on('ui.toast', ($, e, next) => {
    toasts.push(e.text)
    return next(e)
  })
  on('session.measure', ($, e) => ({ changed: e.changed }))
  const measure = (percent: number) =>
    $.session.measure({
      context: { window: 200000, tokens: percent * 2000, percent },
      rateLimits: [{ kind: 'five_hour', percentUsed: 23 }],
      changed: ['context'],
    })
  await measure(50)
  await measure(72)
  await measure(80)
  expect(toasts.length).toBe(1)
  expect(toasts[0]).toContain('72%')
})
