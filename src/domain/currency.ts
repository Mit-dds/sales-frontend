import { AED_TO_USD, EXTRA_CURRENCIES } from '@/constants'
import type { ExtraCurrency } from '@/constants/currencies'
import type { CurrencyInfo } from './types'

export function fmtAED(n: number): string {
  if (!n && n !== 0) return 'AED 0'
  return 'AED ' + Math.round(n).toLocaleString('en-US')
}

export function fmtUSD(n: number, rate?: number): string {
  return 'USD ' + Math.round(n * (rate ?? AED_TO_USD)).toLocaleString('en-US')
}

export function getExtraCurrencies(): ExtraCurrency[] {
  return EXTRA_CURRENCIES
}

export function getCurrencyInfo(code: string): CurrencyInfo | null {
  const map: Record<string, number> = {
    EUR: 0.250, GBP: 0.214, INR: 22.5, RUB: 24.8,
    AUD: 0.421, CAD: 0.371, SAR: 1.02, PKR: 75.6,
  }
  const entry = EXTRA_CURRENCIES.find((c) => c.code === code)
  if (!entry) return null
  return { code: entry.code, symbol: entry.symbol, rate: map[code] ?? 1 }
}

export function convertCurrency(amountAED: number, rate: number): number {
  return Math.round(amountAED * rate)
}

export function fmtExtraCurrency(amountAED: number, currency: CurrencyInfo): string {
  return currency.symbol + convertCurrency(amountAED, currency.rate).toLocaleString('en-US')
}
