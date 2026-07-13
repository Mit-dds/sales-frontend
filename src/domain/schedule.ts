import type { PaymentPlan } from '@/types'
import type { ScheduleRow } from './types'
import { addDays, addMonths, parseCompletionDate, getHandoverMonths } from './dates'

export function buildSchedule(
  plan: Pick<PaymentPlan, 'dp' | 'installmentPct' | 'durationType' | 'durationMonths'>,
  netPrice: number,
  completionDate: string,
  dpSplit?: number,
  bookingToken?: number,
  day7Payment?: number,
): ScheduleRow[] {
  const rows: ScheduleRow[] = []
  const today = new Date()
  const compDate = parseCompletionDate(completionDate) || addMonths(today, 18)
  const hoMonths = getHandoverMonths(completionDate)
  const booking = bookingToken || 20000
  const day7 = day7Payment !== undefined && day7Payment !== null ? day7Payment : 30000

  rows.push({ label: 'Booking Token', date: today, amount: booking, type: 'booking' })

  const dpTotal = Math.round(netPrice * plan.dp / 100)
  const dpAfterBooking = dpTotal - booking

  if (dpAfterBooking > 0) {
    const splits = Math.max(1, dpSplit || 1)
    const baseAmt = Math.floor(dpAfterBooking / splits)
    const remainder = dpAfterBooking - baseAmt * splits
    const splitAmts: number[] = []
    for (let s = 0; s < splits; s++) {
      splitAmts.push(s === splits - 1 ? baseAmt + remainder : baseAmt)
    }

    const firstSplit = splitAmts[0]
    if (firstSplit <= day7) {
      rows.push({ label: `DP 1 of ${splits}`, date: addDays(today, 7), amount: firstSplit, type: 'dp' })
      for (let i = 1; i < splits; i++) {
        rows.push({ label: `DP ${i + 1} of ${splits}`, date: addDays(today, 60 + (i - 1) * 30), amount: splitAmts[i], type: 'dp' })
      }
    } else {
      rows.push({ label: `DP 1 of ${splits} (Day 7)`, date: addDays(today, 7), amount: day7, type: 'dp' })
      const bal = firstSplit - day7
      rows.push({ label: `DP 1 of ${splits} (Day 30)`, date: addDays(today, 30), amount: bal, type: 'dp' })
      for (let j = 1; j < splits; j++) {
        rows.push({ label: `DP ${j + 1} of ${splits}`, date: addDays(today, 60 + (j - 1) * 30), amount: splitAmts[j], type: 'dp' })
      }
    }
  }

  if (plan.installmentPct > 0) {
    const instAmt = Math.round(netPrice * plan.installmentPct / 100)
    let numMonths: number
    if (plan.durationType === 'fixed_months' && plan.durationMonths) {
      numMonths = plan.durationMonths
    } else {
      numMonths = Math.max(0, hoMonths - 2)
      if (compDate) {
        while (numMonths > 0 && addDays(today, 60 + (numMonths - 1) * 30) > compDate) {
          numMonths--
        }
      }
    }
    for (let m = 0; m < numMonths; m++) {
      rows.push({ label: `Installment ${m + 1}`, date: addDays(today, 60 + m * 30), amount: instAmt, type: 'installment' })
    }
  }

  const totalPaid = rows.reduce((s, r) => s + r.amount, 0)
  const compAmt = Math.max(0, Math.round((netPrice - totalPaid) * 100) / 100)
  rows.push({ label: 'On Completion', date: null, amount: compAmt, type: 'handover' })

  return rows
}
