export function parseCompletionDate(s: string): Date | null {
  if (!s) return null
  s = s.trim()

  const qm = s.match(/Q([1-4])\s*(\d{4})/i)
  if (qm) {
    const lastMonths = [2, 5, 8, 11]
    const yr = +qm[2]
    const mo = lastMonths[+qm[1] - 1]
    return new Date(yr, mo + 1, 0)
  }

  const mm = s.match(/([A-Za-z]+)\s*(\d{4})/)
  if (mm) {
    const mmap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      january: 0, february: 1, march: 2, april: 3, june: 5, july: 6,
      august: 7, september: 8, october: 9, november: 10, december: 11,
    }
    const mk = mm[1].toLowerCase()
    if (mmap[mk] !== undefined) {
      return new Date(+mm[2], mmap[mk] + 1, 0)
    }
  }

  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

export function getHandoverMonths(completionDate: string): number {
  const t = parseCompletionDate(completionDate)
  if (!t) return 18
  return Math.max(1, monthsBetween(new Date(), t))
}

export function monthsBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth())
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d)
  r.setMonth(r.getMonth() + n)
  return r
}

export function fmtDate(d: Date | null): string {
  if (!d) return ''
  try {
    return d.toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}
