export const FEES = {
  DLD: { label: 'DLD Registration Fee', pct: 4, fixed: 2194 },
  ADM: { label: 'ADM Registration Fee', pct: 2, fixed: 625 },
  ADGM: { label: 'ADGM Registration Fee', pct: 2, fixed: 5250 },
} as const

export const UTILITY = {
  Apartments: 22000,
  Townhouses: 42000,
} as const

export const DEFAULT_BOOKING_TOKEN = 20000
export const DEFAULT_DAY7_PAYMENT = 30000
