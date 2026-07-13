import type { Project, UnitType } from '@/types'
import { FEES, UTILITY } from '@/constants'

export function calcRegistrationFee(
  netPrice: number,
  project: Pick<Project, 'feePct' | 'feeFixed'>,
  feeType?: keyof typeof FEES,
): number {
  const feePct = project.feePct ?? (feeType ? FEES[feeType].pct : null) ?? 4
  const feeFixed = project.feeFixed ?? (feeType ? FEES[feeType].fixed : null) ?? 2194
  return Math.round(netPrice * feePct / 100) + feeFixed
}

export function calcParking(
  project: Pick<Project, 'parkingCost' | 'type'>,
  unitType: Pick<UnitType, 'label'> | null,
): number {
  const cost = project.parkingCost || 0
  if (!cost || project.type === 'Townhouses') return 0
  const label = ((unitType && unitType.label) || '').toLowerCase()
  const m = label.match(/(\d+)\s*b/)
  const beds = m ? +m[1] : 1
  return cost * (beds >= 3 ? 2 : 1)
}

export function calcUtilityFee(
  project: Pick<Project, 'type' | 'utilityAmount'>,
): number {
  const key = project.type === 'Townhouses' ? 'Townhouses' : 'Apartments'
  return project.utilityAmount || UTILITY[key]
}

export function calcTotalFees(
  netPrice: number,
  project: Pick<Project, 'feePct' | 'feeFixed' | 'type' | 'utilityAmount' | 'parkingCost'>,
  unitType: Pick<UnitType, 'label'> | null,
  feeType?: keyof typeof FEES,
): { regFee: number; parking: number; utility: number; total: number } {
  const regFee = calcRegistrationFee(netPrice, project, feeType)
  const parking = calcParking(project, unitType)
  const utility = calcUtilityFee(project)
  return { regFee, parking, utility, total: regFee + parking + utility }
}
