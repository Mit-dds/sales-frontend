import type { PaymentPlan, Project, Unit } from '@/types'
import type { ScheduleRow } from './types'
import { addDays, getHandoverMonths } from './dates'

export interface RecoveryScheduleInput {
  project: Pick<Project, 'completionDate' | 'bookingToken'>
  unit: Pick<Unit, 'price'>
  basePlan: Pick<PaymentPlan, 'discount' | 'installmentPct' | 'dp'>
  monthlyPct: number
  freq: number
  priceOverride?: number
  extraDiscount?: number
  split?: number
  day7Input?: number
}

export interface RecoveryScheduleResult {
  basePlan: Pick<PaymentPlan, 'discount' | 'installmentPct' | 'dp'>
  netPrice: number
  rows: ScheduleRow[]
  reducedPct: number
  freq: number
}

export function buildRecoverySchedule(input: RecoveryScheduleInput): RecoveryScheduleResult | null {
  const { project, unit, basePlan, monthlyPct, freq, priceOverride, extraDiscount, split, day7Input } = input
  if (!project || !unit || !basePlan || !monthlyPct) return null

  const reducedPct = +monthlyPct
  const originalPct = +basePlan.installmentPct

  if (reducedPct <= 0 || reducedPct >= originalPct) return null
  if (originalPct <= 0) return null
  if (freq < 1 || freq > 12) return null

  const effPriceRec = (priceOverride && +priceOverride > 0) ? +priceOverride : unit.price
  const totalDiscRec = (basePlan.discount || 0) + (extraDiscount || 0)
  const netPrice = effPriceRec * (1 - totalDiscRec / 100)
  const hoMonths = getHandoverMonths(project.completionDate)
  const dpTotal = Math.round(netPrice * basePlan.dp / 100)
  const booking = project.bookingToken || 20000
  const day7 = day7Input !== undefined && day7Input !== null ? +day7Input : 30000
  const today = new Date()

  const rows: ScheduleRow[] = []

  rows.push({ label: 'Booking Token', date: today, amount: booking, type: 'booking' })

  const dpAfterBooking = dpTotal - booking
  const splits = Math.max(1, split || 1)
  const splitAmt = Math.floor(dpAfterBooking / splits)
  const splitRem = dpAfterBooking - splitAmt * splits

  if (splitAmt <= day7) {
    rows.push({ label: `DP 1 of ${splits}`, date: addDays(today, 7), amount: splitAmt + (splits === 1 ? splitRem : 0), type: 'dp' })
    for (let ri = 1; ri < splits; ri++) {
      rows.push({ label: `DP ${ri + 1} of ${splits}`, date: addDays(today, 60 + (ri - 1) * 30), amount: splitAmt + (ri === splits - 1 ? splitRem : 0), type: 'dp' })
    }
  } else {
    rows.push({ label: `DP 1 of ${splits} (Day 7)`, date: addDays(today, 7), amount: day7, type: 'dp' })
    rows.push({ label: `DP 1 of ${splits} (Day 30)`, date: addDays(today, 30), amount: splitAmt - day7 + (splits === 1 ? splitRem : 0), type: 'dp' })
    for (let rj = 1; rj < splits; rj++) {
      rows.push({ label: `DP ${rj + 1} of ${splits}`, date: addDays(today, 60 + (rj - 1) * 30), amount: splitAmt + (rj === splits - 1 ? splitRem : 0), type: 'dp' })
    }
  }

  const lastDPDay = 60
  const totalInstMonths = Math.max(0, hoMonths - 2)
  const lockStart = totalInstMonths - 6
  const deferredPerMonth = Math.round(netPrice * (originalPct - reducedPct) / 100)
  let accumulated = 0

  for (let rm = 0; rm < totalInstMonths; rm++) {
    const dayOff = lastDPDay + rm * 30
    const instDate = addDays(today, dayOff)
    const isLockPeriod = rm >= lockStart
    const isLastRecoveryMonth = (rm === lockStart - 1)

    if (isLockPeriod) {
      rows.push({ label: `Installment ${rm + 1} (Standard)`, date: instDate, amount: Math.round(netPrice * originalPct / 100), type: 'installment' })
    } else {
      const isScheduledRecovery = (rm + 1) % freq === 0

      // BUG FIX: check recovery BEFORE adding deferredPerMonth
      // Recovery collects deferred from PREVIOUS months only, not the current month
      // Forced catch-up takes priority over scheduled recovery
      if (isLastRecoveryMonth && accumulated > 0) {
        rows.push({ label: `Recovery ${rm + 1} (Catch-up)`, date: instDate, amount: Math.round(netPrice * reducedPct / 100) + accumulated, type: 'recovery' })
        accumulated = 0
      } else if (isScheduledRecovery) {
        rows.push({ label: `Recovery ${rm + 1}`, date: instDate, amount: Math.round(netPrice * reducedPct / 100) + accumulated, type: 'recovery' })
        accumulated = 0
      } else {
        rows.push({ label: `Installment ${rm + 1}`, date: instDate, amount: Math.round(netPrice * reducedPct / 100), type: 'installment' })
        accumulated += deferredPerMonth
      }
    }
  }

  const totalPaid = rows.reduce((s, r) => s + r.amount, 0)
  const compAmt = Math.max(0, Math.round(netPrice - totalPaid))
  rows.push({ label: 'On Completion', date: null, amount: compAmt, type: 'completion' })

  return { basePlan, netPrice, rows, reducedPct, freq }
}
