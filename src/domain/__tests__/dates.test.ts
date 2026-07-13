import { describe, it, expect } from 'vitest'
import { parseCompletionDate, getHandoverMonths, monthsBetween, addDays, addMonths, fmtDate } from '../dates'

describe('parseCompletionDate', () => {
  it('parses Q1 2028', () => {
    const d = parseCompletionDate('Q1 2028')
    expect(d).not.toBeNull()
    expect(d!.getFullYear()).toBe(2028)
    expect(d!.getMonth()).toBe(2)
    expect(d!.getDate()).toBe(31)
  })

  it('parses Q4 2029', () => {
    const d = parseCompletionDate('Q4 2029')
    expect(d).not.toBeNull()
    expect(d!.getFullYear()).toBe(2029)
    expect(d!.getMonth()).toBe(11)
    expect(d!.getDate()).toBe(31)
  })

  it('parses "Dec 2028"', () => {
    const d = parseCompletionDate('Dec 2028')
    expect(d).not.toBeNull()
    expect(d!.getFullYear()).toBe(2028)
    expect(d!.getMonth()).toBe(11)
    expect(d!.getDate()).toBe(31)
  })

  it('parses "December 2028"', () => {
    const d = parseCompletionDate('December 2028')
    expect(d).not.toBeNull()
    expect(d!.getFullYear()).toBe(2028)
    expect(d!.getMonth()).toBe(11)
    expect(d!.getDate()).toBe(31)
  })

  it('parses ISO date string', () => {
    const d = parseCompletionDate('2028-06-15')
    expect(d).not.toBeNull()
    expect(d!.getFullYear()).toBe(2028)
    expect(d!.getMonth()).toBe(5)
    expect(d!.getDate()).toBe(15)
  })

  it('returns null for empty input', () => {
    expect(parseCompletionDate('')).toBeNull()
    expect(parseCompletionDate(null as unknown as string)).toBeNull()
  })

  it('returns null for invalid input', () => {
    expect(parseCompletionDate('garbage')).toBeNull()
  })
})

describe('getHandoverMonths', () => {
  it('returns 18 for empty completion date', () => {
    expect(getHandoverMonths('')).toBe(18)
  })

  it('returns at least 1', () => {
    expect(getHandoverMonths('Q1 2026')).toBeGreaterThanOrEqual(1)
  })
})

describe('monthsBetween', () => {
  it('returns 12 for one year difference', () => {
    const a = new Date(2025, 0, 1)
    const b = new Date(2026, 0, 1)
    expect(monthsBetween(a, b)).toBe(12)
  })

  it('returns 0 for same month', () => {
    const a = new Date(2025, 5, 1)
    const b = new Date(2025, 5, 15)
    expect(monthsBetween(a, b)).toBe(0)
  })

  it('returns 0 when a is after b', () => {
    const a = new Date(2026, 0, 1)
    const b = new Date(2025, 0, 1)
    expect(monthsBetween(a, b)).toBe(0)
  })
})

describe('addDays', () => {
  it('adds 7 days', () => {
    const d = new Date(2025, 0, 1)
    const r = addDays(d, 7)
    expect(r.getDate()).toBe(8)
    expect(r.getMonth()).toBe(0)
  })
})

describe('addMonths', () => {
  it('adds 1 month', () => {
    const d = new Date(2025, 0, 1)
    const r = addMonths(d, 1)
    expect(r.getMonth()).toBe(1)
  })
})

describe('fmtDate', () => {
  it('formats a date', () => {
    const d = new Date(2025, 0, 15)
    const formatted = fmtDate(d)
    expect(formatted).toBeTruthy()
    expect(formatted).toContain('Jan')
    expect(formatted).toContain('2025')
  })

  it('returns empty for null', () => {
    expect(fmtDate(null)).toBe('')
  })
})
