import { expect, test } from 'claude-code/testing'

const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 160, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

const TOOL_ROW = {
  component: 'ToolUse',
  props: { tool_use_id: 't1', tool: 'Bash', input: { command: 'ls' }, isRunning: false, isErrored: false, isInterrupted: false },
} as const

const COMPOSE = { model: 'm', promptModel: 'm', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] } as const

test('Quiet toggles the system prompt instruction and hides tool rows', async ($, on) => {
  on('prompt.compose', () => ({ sections: [{ id: 'base', text: 'base', scope: 'session' }] }))
  on('ui.render', ({}, e) => ({ type: 'Text', props: {}, children: ['engine row'] }) as never)
  on('ui.toast', ($, e, next) => next(e))

  const sectionIds = async () => (await $.prompt.compose(COMPOSE as never)).sections.map(s => s.id)
  expect(await sectionIds()).toEqual(['base'])
  const before = await $.ui.mount({ plugin: 'context-band', surface: 'terminal', ...TOOL_ROW } as never)
  expect(await before.find({ text: /engine row/ })).toBeDefined()
  await before.unmount()

  const band = await $.ui.mount({ plugin: 'context-band', surface: 'terminal', ...BAND })
  await band.press({ key: 'quiet' })
  expect(await sectionIds()).toEqual(['base', 'context-band:quiet'])

  const row = await $.ui.mount({ plugin: 'context-band', surface: 'terminal', ...TOOL_ROW } as never)
  expect(await row.find({ text: /engine row/ })).toBeUndefined()

  await band.press({ key: 'quiet' })
  expect(await sectionIds()).toEqual(['base'])
})
