import { describe, it, expect } from 'vitest'
import { calcRegistrationFee, calcParking, calcUtilityFee, calcTotalFees } from '../fees'

describe('calcRegistrationFee', () => {
  it('calculates DLD fee for 1M AED at 4% + 2194', () => {
    const project = { feePct: 4, feeFixed: 2194 }
    const fee = calcRegistrationFee(1000000, project)
    expect(fee).toBe(42194)
  })

  it('uses feeType to look up defaults', () => {
    const project = { feePct: null as unknown as number, feeFixed: null as unknown as number }
    const fee = calcRegistrationFee(1000000, project, 'DLD')
    expect(fee).toBe(42194)
  })
})

describe('calcParking', () => {
  it('returns 0 for Townhouses', () => {
    const project = { parkingCost: 30000, type: 'Townhouses' as const }
    expect(calcParking(project, { label: '3 Bedroom' })).toBe(0)
  })

  it('returns 0 if no parking cost', () => {
    const project = { parkingCost: 0, type: 'Apartments' as const }
    expect(calcParking(project, { label: '1 Bedroom' })).toBe(0)
  })

  it('returns cost * 1 for < 3 bed apartments', () => {
    const project = { parkingCost: 30000, type: 'Apartments' as const }
    expect(calcParking(project, { label: '1 Bedroom' })).toBe(30000)
    expect(calcParking(project, { label: '2 Bedroom' })).toBe(30000)
  })

  it('returns cost * 2 for >= 3 bed apartments', () => {
    const project = { parkingCost: 30000, type: 'Apartments' as const }
    expect(calcParking(project, { label: '3 Bedroom' })).toBe(60000)
    expect(calcParking(project, { label: '4 Bedroom' })).toBe(60000)
  })

  it('defaults to 1 bed if no label match', () => {
    const project = { parkingCost: 25000, type: 'Apartments' as const }
    expect(calcParking(project, null)).toBe(25000)
    expect(calcParking(project, { label: 'Studio' })).toBe(25000)
  })
})

describe('calcUtilityFee', () => {
  it('returns 42000 for Townhouses', () => {
    const project = { type: 'Townhouses' as const, utilityAmount: 0 }
    expect(calcUtilityFee(project)).toBe(42000)
  })

  it('returns 22000 for Apartments', () => {
    const project = { type: 'Apartments' as const, utilityAmount: 0 }
    expect(calcUtilityFee(project)).toBe(22000)
  })

  it('uses project.utilityAmount if set', () => {
    const project = { type: 'Apartments' as const, utilityAmount: 15000 }
    expect(calcUtilityFee(project)).toBe(15000)
  })
})

describe('calcTotalFees', () => {
  it('returns all fees combined', () => {
    const result = calcTotalFees(1000000, { feePct: 4, feeFixed: 2194, type: 'Apartments' as const, utilityAmount: 0, parkingCost: 30000 }, { label: '1 Bedroom' })
    expect(result.regFee).toBe(42194)
    expect(result.parking).toBe(30000)
    expect(result.utility).toBe(22000)
    expect(result.total).toBe(94194)
  })
})
