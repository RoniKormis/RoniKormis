export type Handoff = { isRunning: boolean; path?: string }

export type Usage = { context?: number; fiveHour?: number; week?: number }

declare module 'claude-code' {
  interface PluginState {
    'context-band': { usage: Usage; sentAt: number | null; now: number; warned: boolean; handoff: Handoff | null; quiet: boolean }
  }
}
