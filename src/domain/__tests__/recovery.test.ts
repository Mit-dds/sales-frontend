import { describe, it, expect, vi } from 'vitest'
import { buildRecoverySchedule } from '../recovery'

const sampleProject = { completionDate: 'Q1 2028', bookingToken: 20000 }
const sampleUnit = { price: 1000000 }
const sampleBasePlan = { discount: 5, installmentPct: 1, dp: 10 }

describe('buildRecoverySchedule', () => {
  it('returns null if required inputs are missing', () => {
    const result = buildRecoverySchedule({
      project: sampleProject,
      unit: sampleUnit,
      basePlan: sampleBasePlan,
      monthlyPct: 0,
      freq: 3,
    })
    expect(result).toBeNull()
  })

  it('returns null when reducedPct >= originalPct', () => {
    const result = buildRecoverySchedule({
      project: sampleProject,
      unit: sampleUnit,
      basePlan: { discount: 5, installmentPct: 1, dp: 10 },
      monthlyPct: 1,
      freq: 3,
    })
    expect(result).toBeNull()
  })

  it('returns null when originalPct is 0 (no installments)', () => {
    const result = buildRecoverySchedule({
      project: sampleProject,
      unit: sampleUnit,
      basePlan: { discount: 0, installmentPct: 0, dp: 100 },
      monthlyPct: 0.5,
      freq: 3,
    })
    expect(result).toBeNull()
  })

  it('returns null when recoveryFreq is out of range', () => {
    const result1 = buildRecoverySchedule({ project: sampleProject, unit: sampleUnit, basePlan: sampleBasePlan, monthlyPct: 0.5, freq: 0 })
    expect(result1).toBeNull()
    const result2 = buildRecoverySchedule({ project: sampleProject, unit: sampleUnit, basePlan: sampleBasePlan, monthlyPct: 0.5, freq: 13 })
    expect(result2).toBeNull()
  })

  it('builds a recovery schedule with rows', () => {
    const result = buildRecoverySchedule({
      project: sampleProject,
      unit: sampleUnit,
      basePlan: sampleBasePlan,
      monthlyPct: 0.5,
      freq: 3,
    })
    expect(result).not.toBeNull()
    expect(result!.rows.length).toBeGreaterThan(0)
    expect(result!.rows[0].label).toBe('Booking Token')
    expect(result!.netPrice).toBeGreaterThan(0)
  })

  it('includes completion row at the end', () => {
    const result = buildRecoverySchedule({
      project: sampleProject,
      unit: sampleUnit,
      basePlan: sampleBasePlan,
      monthlyPct: 0.5,
      freq: 3,
    })
    const lastRow = result!.rows[result!.rows.length - 1]
    expect(lastRow.label).toBe('On Completion')
    expect(lastRow.type).toBe('completion')
    expect(lastRow.date).toBeNull()
  })

  it('handles price override', () => {
    const result = buildRecoverySchedule({
      project: sampleProject,
      unit: sampleUnit,
      basePlan: sampleBasePlan,
      monthlyPct: 0.5,
      freq: 3,
      priceOverride: 1200000,
    })
    expect(result).not.toBeNull()
    expect(result!.netPrice).toBe(1140000)
  })

  it('contains dp and recovery rows', () => {
    const result = buildRecoverySchedule({
      project: sampleProject,
      unit: sampleUnit,
      basePlan: { discount: 5, installmentPct: 1, dp: 10 },
      monthlyPct: 0.5,
      freq: 2,
    })
    const types = new Set(result!.rows.map((r) => r.type))
    expect(types.has('dp')).toBe(true)
    expect(types.has('recovery')).toBe(true)
    expect(types.has('completion')).toBe(true)
  })

  it('sum of all rows equals netPrice', () => {
    const result = buildRecoverySchedule({
      project: sampleProject,
      unit: sampleUnit,
      basePlan: sampleBasePlan,
      monthlyPct: 0.5,
      freq: 3,
    })
    const total = result!.rows.reduce((s, r) => s + r.amount, 0)
    expect(total).toBe(Math.round(result!.netPrice))
  })

  it('recovery includes current months deferred', () => {
    const today = new Date()
    vi.useFakeTimers()
    vi.setSystemTime(today)
    const fixedProject = { completionDate: 'Jan 2028', bookingToken: 20000 }
    const fixedUnit = { price: 1350000 }
    const fixedPlan = { discount: 15, installmentPct: 1, dp: 15 }
    const result = buildRecoverySchedule({
      project: fixedProject,
      unit: fixedUnit,
      basePlan: fixedPlan,
      monthlyPct: 0.5,
      freq: 6,
      split: 1,
      day7Input: 30000,
    })
    vi.useRealTimers()
    expect(result).not.toBeNull()
    const recovery6 = result!.rows.find((r) => r.label === 'Recovery 6')
    expect(recovery6).toBeDefined()
    expect(recovery6!.amount).toBe(40166)
  })
})
