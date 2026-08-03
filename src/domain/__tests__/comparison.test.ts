import { describe, it, expect } from 'vitest'
import { getPlanData, buildComparison, planDurationMonths } from '../comparison'
import type { PaymentPlan, UnitType } from '@/types'

const samplePlan: PaymentPlan = {
  id: 'sp1', planType: 'normal', label: '10% DP + 1% Monthly',
  dp: 10, installmentPct: 1, onHandover: 0,
  durationType: 'till_handover', durationMonths: null,
  discount: 5, eventName: '', eventDiscount: null,
  eventInstallmentPct: null, eventDurationType: 'till_handover', eventDurationMonths: null,
}

const sampleProject = {
  type: 'Apartments' as const,
  feePct: 4,
  feeFixed: 2194,
  feeLabel: 'DLD Registration Fee',
  utilityAmount: 0,
  parkingCost: 30000,
}

const sampleUnit = { price: 1000000 }
const sampleUnitType: UnitType = { id: 'ut1', label: '1 Bedroom', subtypes: [], paymentPlans: [], floorPlans: {} }

describe('getPlanData', () => {
  it('calculates plan data correctly', () => {
    const data = getPlanData({
      plan: samplePlan,
      unit: sampleUnit,
      project: sampleProject,
      unitType: sampleUnitType,
      hoMonths: 20,
    })
    expect(data.effDisc).toBe(5)
    expect(data.netPrice).toBe(980000)
    expect(data.discAmt).toBe(50000)
    expect(data.dld).toBe(41394)
    expect(data.utility).toBe(22000)
    expect(data.parking).toBe(30000)
    expect(data.dpAmt).toBe(98000)
    expect(data.instMonthly).toBe(9800)
    expect(data.total).toBeGreaterThan(980000)
  })

  it('uses event discount when isEvent is true', () => {
    const eventPlan: PaymentPlan = {
      ...samplePlan,
      eventDiscount: 10,
      eventInstallmentPct: 0.5,
    }
    const data = getPlanData({
      plan: eventPlan,
      unit: sampleUnit,
      project: sampleProject,
      unitType: sampleUnitType,
      hoMonths: 20,
      isEvent: true,
    })
    expect(data.effDisc).toBe(10)
    expect(data.netPrice).toBe(930000)
  })
})

describe('buildComparison', () => {
  it('builds comparison data for multiple plans', () => {
    const plan2: PaymentPlan = { ...samplePlan, id: 'sp2', dp: 20, discount: 7.5 }
    const result = buildComparison([samplePlan, plan2], {
      unit: sampleUnit,
      project: sampleProject,
      unitType: sampleUnitType,
      hoMonths: 20,
    })
    expect(result).toHaveLength(2)
    expect(result[0].plan.id).toBe('sp1')
    expect(result[0].data.netPrice).toBe(980000)
    expect(result[1].plan.id).toBe('sp2')
    expect(result[1].data.netPrice).toBe(955000)
  })
})

describe('planDurationMonths', () => {
  it('shows fixed months', () => {
    expect(planDurationMonths({ durationType: 'fixed_months', durationMonths: 12 }, 20)).toBe('12mo')
  })

  it('shows till HO for till_handover', () => {
    expect(planDurationMonths({ durationType: 'till_handover', durationMonths: null }, 20)).toBe('20mo (till HO)')
  })
})
