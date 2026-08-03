import type { PaymentPlan } from '@/types'
import type { PlanData, PlanDataParams } from './types'
import { calcParking } from './fees'

export function getPlanData(params: PlanDataParams): PlanData {
  const { plan, unit, project, unitType, hoMonths, isEvent } = params
  const effDisc = isEvent && plan.eventDiscount != null ? plan.eventDiscount : plan.discount
  const parking = calcParking(project, unitType)
  const discountedPrice = unit.price * (1 - effDisc / 100)
  const isTownhouse = project.type === 'Townhouses' || (project.type || '').toLowerCase().includes('townhouse')
  const netPrice = isTownhouse ? discountedPrice : discountedPrice + parking
  const discAmt = unit.price * effDisc / 100
  const feePct = project.feePct || 4
  const feeFixed = project.feeFixed || 2194
  const dld = netPrice * feePct / 100 + feeFixed
  let utility: number
  if (project.type === 'Townhouses') {
    utility = 42000
  } else {
    utility = 22000
  }
  if (project.utilityAmount) utility = project.utilityAmount
  const dpAmt = netPrice * plan.dp / 100
  const instMonths = plan.durationType === 'fixed_months' && plan.durationMonths
    ? plan.durationMonths
    : Math.max(0, hoMonths - 2)
  const instTotal = plan.installmentPct > 0 ? netPrice * plan.installmentPct / 100 * instMonths : 0
  const instMonthly = plan.installmentPct > 0 ? netPrice * plan.installmentPct / 100 : 0
  const hoAmt = Math.max(0, netPrice - dpAmt - instTotal)
  const total = netPrice + dld + utility
  return { effDisc, netPrice, discountedPrice, discAmt, dld, utility, parking, dpAmt, instMonthly, instTotal, hoAmt, total }
}

export interface ComparisonPlan {
  plan: PaymentPlan
  data: PlanData
}

export function buildComparison(
  plans: PaymentPlan[],
  params: Omit<PlanDataParams, 'plan'>,
): ComparisonPlan[] {
  return plans.map((plan) => ({
    plan,
    data: getPlanData({ ...params, plan }),
  }))
}

export function planDurationMonths(p: Pick<PaymentPlan, 'durationType' | 'durationMonths'>, hoMonths: number): string {
  if (p.durationType === 'fixed_months' && p.durationMonths) return `${p.durationMonths}mo`
  return `${hoMonths}mo (till HO)`
}
