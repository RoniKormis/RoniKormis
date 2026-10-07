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

const HUE = (pct: number) => (pct >= 85 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e')

export const pillSvg = (pct: number, width = 120) => {
  const w = Math.max(0, Math.min(100, pct)) / 100 * width
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="6" viewBox="0 0 ${width} 6"><rect width="${width}" height="6" rx="3" fill="rgba(127,127,127,0.22)"/>${w > 0 ? `<rect width="${Math.max(6, w).toFixed(1)}" height="6" rx="3" fill="${HUE(pct)}"/>` : ''}</svg>`
}

export const ringSvg = (fractionLeft: number, color: string) => {
  const r = 7
  const c = 2 * Math.PI * r
  const f = Math.max(0, Math.min(1, fractionLeft))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="${r}" fill="none" stroke="rgba(127,127,127,0.22)" stroke-width="2.5"/><circle cx="9" cy="9" r="${r}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${(c * f).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 9 9)"/></svg>`
}
