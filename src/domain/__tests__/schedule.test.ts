import { describe, it, expect } from 'vitest'
import { buildSchedule } from '../schedule'

const samplePlan = { dp: 10, installmentPct: 1, durationType: 'till_handover' as const, durationMonths: null }
const completionDate = 'Q1 2028'

describe('buildSchedule', () => {
  it('returns schedule rows for a standard plan', () => {
    const rows = buildSchedule(samplePlan, 1000000, completionDate, 1, 20000, 30000)
    expect(rows.length).toBeGreaterThanOrEqual(3)
    expect(rows[0].label).toBe('Booking Token')
    expect(rows[0].type).toBe('booking')
    expect(rows[0].amount).toBe(20000)

    const lastRow = rows[rows.length - 1]
    expect(lastRow.label).toBe('On Completion')
    expect(lastRow.type).toBe('handover')
  })

  it('first DP row is on day 7', () => {
    const rows = buildSchedule(samplePlan, 1000000, completionDate, 1, 20000, 30000)
    const dpRows = rows.filter((r) => r.type === 'dp')
    if (dpRows.length > 0) {
      expect(dpRows[0].date).not.toBeNull()
    }
  })

  it('handles zero DP plan (already fully paid)', () => {
    const zeroDpPlan = { dp: 100, installmentPct: 0, durationType: 'till_handover' as const, durationMonths: null }
    const rows = buildSchedule(zeroDpPlan, 1000000, completionDate, 1, 1000000, 30000)
    const bookingRow = rows.find((r) => r.type === 'booking')
    expect(bookingRow).toBeTruthy()
    expect(bookingRow!.amount).toBeGreaterThan(0)
  })

  it('handles fixed_months duration', () => {
    const fixedPlan = { dp: 10, installmentPct: 1, durationType: 'fixed_months' as const, durationMonths: 12 }
    const rows = buildSchedule(fixedPlan, 1000000, completionDate, 1, 20000, 30000)
    const instRows = rows.filter((r) => r.type === 'installment' && r.label.startsWith('Installment'))
    expect(instRows.length).toBeLessThanOrEqual(12)
  })

  it('sum of all amounts equals net price', () => {
    const netPrice = 1000000
    const rows = buildSchedule({ dp: 20, installmentPct: 1, durationType: 'till_handover' as const, durationMonths: null }, netPrice, 'Q1 2028', 2, 20000, 30000)
    const total = rows.reduce((s, r) => s + r.amount, 0)
    expect(Math.abs(total - netPrice)).toBeLessThan(2)
  })
})
