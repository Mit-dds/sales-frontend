import type { PaymentPlan, Project, UnitType, Unit } from '@/types'

export interface ScheduleRow {
  label: string
  date: Date | null
  amount: number
  type: 'booking' | 'dp' | 'installment' | 'handover' | 'completion' | 'recovery'
}

export interface PlanData {
  effDisc: number
  netPrice: number
  discAmt: number
  dld: number
  utility: number
  parking: number
  dpAmt: number
  instMonthly: number
  instTotal: number
  hoAmt: number
  total: number
}

export interface PlanDataParams {
  plan: PaymentPlan
  unit: Pick<Unit, 'price'>
  project: Pick<Project, 'type' | 'feePct' | 'feeFixed' | 'feeLabel' | 'utilityAmount' | 'parkingCost'>
  unitType: Pick<UnitType, 'label'> | null
  hoMonths: number
  isEvent?: boolean
  feePctOverride?: number
  feeFixedOverride?: number
}

export interface RecoveryScheduleParams {
  netPrice: number
  completionDate: string
  basePlan: Pick<PaymentPlan, 'discount' | 'installmentPct' | 'dp'>
  monthlyPct: number
  freq: number
  priceOverride?: number
  extraDiscount?: number
  split?: number
  day7Input?: number
  bookingToken?: number
}

export type CurrencyInfo = {
  code: string
  symbol: string
  rate: number
}

export interface ParseResult {
  added: number
  skipped: number
  errors: string[]
  byCity: Record<string, number>
}

export interface ColumnMap {
  city?: number
  project?: number
  num?: number
  propType?: number
  type?: number
  subtype?: number
  placement?: number
  floor?: number
  internal?: number
  external?: number
  total?: number
  price?: number
}
