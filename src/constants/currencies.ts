export interface ExtraCurrency {
  code: string
  symbol: string
}

export const EXTRA_CURRENCIES: ExtraCurrency[] = [
  { code: 'EUR', symbol: 'EUR ' },
  { code: 'GBP', symbol: 'GBP ' },
  { code: 'INR', symbol: 'INR ' },
  { code: 'RUB', symbol: 'RUB ' },
  { code: 'AUD', symbol: 'AUD ' },
  { code: 'CAD', symbol: 'CAD ' },
  { code: 'SAR', symbol: 'SAR ' },
  { code: 'PKR', symbol: 'PKR ' },
]

export const AED_TO_USD = 0.272
