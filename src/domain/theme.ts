export interface Theme {
  isDark: boolean
  coverBg: string
  coverText: string
  coverSubtext: string
  coverAccent: string
  coverBorder: string
  pageBg: string
  sectionBg: string
  cardBg: string
  text: string
  textMid: string
  textDim: string
  border: string
  accent: string
  accentGlow: string
  priceColor: string
  savingsBg: string
  savingsBorder: string
  timelineLine: string
  timelineDot: string
}

export function hexRgb(hex: string): string {
  if (!hex) return '0,0,0'
  let h = hex.replace('#', '')
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r},${g},${b}`
}

export function adjustColor(hex: string, amt: number): string {
  if (!hex) return '#888'
  try {
    let r = parseInt(hex.slice(1, 3), 16)
    let g = parseInt(hex.slice(3, 5), 16)
    let b = parseInt(hex.slice(5, 7), 16)
    r = Math.max(0, Math.min(255, r + Math.round(amt * 255)))
    g = Math.max(0, Math.min(255, g + Math.round(amt * 255)))
    b = Math.max(0, Math.min(255, b + Math.round(amt * 255)))
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  } catch {
    return hex
  }
}

export function getAdaptiveTheme(hex?: string): Theme {
  const safe = hex || '#1A3C6B'
  return {
    isDark: false,
    coverBg: '#FAFAF8',
    coverText: '#1A2340',
    coverSubtext: 'rgba(26,35,64,0.45)',
    coverAccent: safe,
    coverBorder: 'rgba(0,0,0,0.08)',
    pageBg: '#FFFFFF',
    sectionBg: '#F8FAFD',
    cardBg: '#FFFFFF',
    text: '#1A2340',
    textMid: '#4A5880',
    textDim: '#8892AA',
    border: '#EEF0F4',
    accent: safe,
    accentGlow: `0 4px 20px rgba(${hexRgb(safe)},0.15)`,
    priceColor: safe,
    savingsBg: 'rgba(39,174,96,0.06)',
    savingsBorder: 'rgba(39,174,96,0.2)',
    timelineLine: 'rgba(0,0,0,0.07)',
    timelineDot: safe,
  }
}
