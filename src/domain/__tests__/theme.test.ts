import { describe, it, expect } from 'vitest'
import { hexRgb, adjustColor, getAdaptiveTheme } from '../theme'

describe('hexRgb', () => {
  it('converts #1A3C6B', () => {
    expect(hexRgb('#1A3C6B')).toBe('26,60,107')
  })

  it('converts #1A3C6B without hash', () => {
    expect(hexRgb('1A3C6B')).toBe('26,60,107')
  })

  it('converts short hex #fff', () => {
    expect(hexRgb('#fff')).toBe('255,255,255')
  })

  it('returns 0,0,0 for empty', () => {
    expect(hexRgb('')).toBe('0,0,0')
  })
})

describe('adjustColor', () => {
  it('lightens a color', () => {
    const result = adjustColor('#1A3C6B', 0.2)
    expect(result).toBe('#4d6f9e')
  })

  it('darkens a color', () => {
    const result = adjustColor('#1A3C6B', -0.2)
    expect(result).toBe('#000938')
  })

  it('clamps to 0-255', () => {
    const result = adjustColor('#1A3C6B', -5)
    expect(result).toBe('#000000')
  })

  it('returns fallback for empty', () => {
    expect(adjustColor('', 0.1)).toBe('#888')
  })
})

describe('getAdaptiveTheme', () => {
  it('returns default theme with no argument', () => {
    const theme = getAdaptiveTheme()
    expect(theme.isDark).toBe(false)
    expect(theme.coverBg).toBe('#FAFAF8')
    expect(theme.coverText).toBe('#1A2340')
    expect(theme.text).toBe('#1A2340')
  })

  it('uses provided primary color as accent', () => {
    const theme = getAdaptiveTheme('#B8860B')
    expect(theme.coverAccent).toBe('#B8860B')
    expect(theme.accent).toBe('#B8860B')
    expect(theme.priceColor).toBe('#B8860B')
    expect(theme.coverAccent).toBe('#B8860B')
  })
})
