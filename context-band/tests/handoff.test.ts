import { expect, mock, test } from 'claude-code/testing'

import { isHandoffFile } from '../hooks/util'

const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 160, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

test('recognizes handoff files', async () => {
  expect(isHandoffFile('/a/paiq-handoff-2026-10-07-content-team.md')).toBe(true)
  expect(isHandoffFile('/a/handoff-2026-10-07-14h.md')).toBe(true)
  expect(isHandoffFile('/a/now.md')).toBe(false)
  expect(isHandoffFile('/handoff/notes.txt')).toBe(false)
})

test('button runs /handoff, then opens Terminal with the written file', async ($, on) => {
  const commands: string[] = []
  const spawned: string[][] = []
  on('command.run', ($, e) => (commands.push(e.command), {}))
  on('tool.call', () => ({ result: {}, text: 'ok' }) as never)
  on('process.run', ($, e) => (spawned.push([...e.argv]), { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('session.cwd', () => ({ value: '/Users/roni/proj' }))
  on('ui.toast', ($, e, next) => next(e))
  on('turn.complete', () => ({ text: '' }))
  mock.clock(on)
  mock.store(on)

  const ui = await $.ui.mount({ plugin: 'context-band', surface: 'terminal', ...BAND })
  await ui.press({ key: 'handoff' })
  expect(commands).toEqual(['handoff'])

  await $.tool.call({ tool: 'Write', file_path: '/Users/roni/proj/paiq-handoff-x.md', content: 'x' })
  await $.turn.complete({ reason: 'answer', answer: '', durationMs: 1, isAborted: false, turnId: 't1' })

  expect(spawned[0]?.[0]).toBe('osascript')
  expect(spawned[0]?.[2]).toContain("cd '/Users/roni/proj' && claude")
})

test('new window picks up the handoff: /rc, then the continue prompt', async ($, on) => {
  const commands: string[] = []
  const prompts: string[] = []
  on('command.run', ($, e) => (commands.push(e.command), {}))
  on('prompt.submit', ($, e) => (prompts.push(e.text), { text: e.text }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: '/Users/roni/proj' }))
  const clock = mock.clock(on)
  mock.store(on, { pending: { path: '/Users/roni/proj/handoff-1.md', cwd: '/Users/roni/proj', at: clock.now() } })

  await $.session.start({ cwd: '/Users/roni/proj', surface: 'terminal', isInteractive: true })
  await clock.advance(2000)

  expect(commands).toEqual(['remote-control'])
  expect(prompts[0]).toBe('Read now.md first, then continue the work from the handoff at /Users/roni/proj/handoff-1.md')
})

test('band draws on terminal and desktop with the Handoff button', async ($, on) => {
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'context-band', surface, ...BAND })
    expect(await ui.find({ key: 'handoff' })).toBeDefined()
    await ui.unmount()
  }
})
