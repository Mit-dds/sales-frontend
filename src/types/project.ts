export interface PaymentPlan {
  id: string
  planType: 'normal' | 'event' | 'both'
  label: string
  dp: number
  installmentPct: number
  onHandover: number
  durationType: 'till_handover' | 'fixed_months'
  durationMonths: number | null
  discount: number
  eventName: string
  eventDiscount: number | null
  eventInstallmentPct: number | null
  eventDurationType: 'till_handover' | 'fixed_months'
  eventDurationMonths: number | null
  sortOrder?: number
}

export interface FloorPlan {
  name: string
  dataUrl: string
  isImage: boolean
  file?: File
}

export interface UnitType {
  id: string
  label: string
  subtypes: string[]
  paymentPlans: PaymentPlan[]
  floorPlans: Record<string, FloorPlan>
  virtualTour?: string
}

export interface Project {
  id: string
  name: string
  location: string
  type: 'Apartments' | 'Townhouses' | 'Mixed'
  status: string
  completionDate: string
  feeLabel: string
  feePct: number
  feeFixed: number
  utilityAmount: number
  parkingCost: number
  bookingToken: number
  day7Payment: number
  primaryColor: string
  secondaryColor: string
  dpSplitOptions: number[]
  disclaimer: string
  whyBuy: string[]
  heroImage: string | null
  masterPlan: FloorPlan | null
  floorPlans: Record<string, FloorPlan>
  unitTypes: UnitType[]
  totalPlans?: number
  unitTypeCount?: number
  whyBuyCount?: number
}
