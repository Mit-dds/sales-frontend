export type OfferType = 'single' | 'allplans' | 'comparison' | 'recovery'

export interface OfferScheduleRow {
  label: string
  date: Date | null
  amount: number
  type: 'booking' | 'dp' | 'installment' | 'handover' | 'completion' | 'recovery'
}

export interface OfferHistory {
  id: string
  date: string
  agentId: string
  agentName: string
  clientName: string
  clientPhone: string
  projectName: string
  unitNumber: string
  unitType?: string
  planLabel: string
  offerMode?: string
  discount: number
  netPrice: number
  type: string
  action: string
}
