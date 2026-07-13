import { describe, it, expect } from 'vitest'
import { fmtAED, fmtUSD, getExtraCurrencies, getCurrencyInfo, convertCurrency, fmtExtraCurrency } from '../currency'

describe('fmtAED', () => {
  it('formats 1000000', () => {
    expect(fmtAED(1000000)).toBe('AED 1,000,000')
  })

  it('formats 0', () => {
    expect(fmtAED(0)).toBe('AED 0')
  })

  it('formats 2194', () => {
    expect(fmtAED(2194)).toBe('AED 2,194')
  })
})

describe('fmtUSD', () => {
  it('converts 1000000 AED to USD at default rate', () => {
    const result = fmtUSD(1000000)
    expect(result).toContain('USD')
    expect(result).toContain('272,000')
  })

  it('uses custom rate', () => {
    const result = fmtUSD(1000000, 0.3)
    expect(result).toContain('300,000')
  })
})

describe('getExtraCurrencies', () => {
  it('returns all currencies', () => {
    const currencies = getExtraCurrencies()
    expect(currencies.length).toBeGreaterThan(0)
    expect(currencies.find((c) => c.code === 'EUR')).toBeTruthy()
    expect(currencies.find((c) => c.code === 'GBP')).toBeTruthy()
  })
})

describe('getCurrencyInfo', () => {
  it('returns info for EUR', () => {
    const info = getCurrencyInfo('EUR')
    expect(info).not.toBeNull()
    expect(info!.code).toBe('EUR')
    expect(info!.rate).toBeGreaterThan(0)
  })

  it('returns null for unknown currency', () => {
    expect(getCurrencyInfo('XYZ')).toBeNull()
  })
})

describe('convertCurrency', () => {
  it('converts AED to EUR at 0.250 rate', () => {
    expect(convertCurrency(1000000, 0.250)).toBe(250000)
  })
})

describe('fmtExtraCurrency', () => {
  it('formats in extra currency', () => {
    const info = getCurrencyInfo('EUR')!
    const result = fmtExtraCurrency(1000000, info)
    expect(result).toContain('EUR')
    expect(typeof result).toBe('string')
  })
})
