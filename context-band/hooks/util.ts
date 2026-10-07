export const bar = (pct: number, cells = 10) => {
  const full = Math.round((Math.min(100, Math.max(0, pct)) / 100) * cells)
  return '█'.repeat(full) + '░'.repeat(cells - full)
}

export const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export const isHandoffFile = (path: string) => /handoff[^/]*\.md$/i.test(path)

export const sh = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`
export const osa = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
