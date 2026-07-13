import type { Project } from '@/types'
import { TEMPLATE_PLANS } from '@/constants'

const clonePlans = () => TEMPLATE_PLANS.map(p => ({ ...p, id: `sp_${Date.now()}_${Math.random()}` }))

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p1', name: 'Verdana Residence', location: 'Dubai',
    type: 'Apartments', status: 'Off-plan', completionDate: 'Q4 2026',
    feeLabel: 'DLD Registration Fee', feePct: 4, feeFixed: 2194,
    utilityAmount: 22000, parkingCost: 40000,
    bookingToken: 20000, day7Payment: 30000,
    primaryColor: '#1A6B4A', secondaryColor: '#A8D5B5',
    dpSplitOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    disclaimer: 'Prices are subject to change. This offer is valid for 7 days.',
    whyBuy: [
      'Freehold for all nationalities',
      'DLD fee waiver',
      '0% commission',
      'Flexible payment plans',
      'Premium amenities',
    ],
    heroImage: null, masterPlan: null, floorPlans: {},
    unitTypes: [
      {
        id: 'ut1', label: 'Studio',
        subtypes: ['Type A'],
        paymentPlans: clonePlans(),
        floorPlans: {},
      },
      {
        id: 'ut2', label: '1BR',
        subtypes: ['Type A', 'Type B'],
        paymentPlans: clonePlans(),
        floorPlans: {},
      },
      {
        id: 'ut3', label: '2BR',
        subtypes: ['Type A'],
        paymentPlans: clonePlans(),
        floorPlans: {},
      },
    ],
  },
  {
    id: 'p2', name: 'Taormina Village', location: 'Abu Dhabi ADM',
    type: 'Townhouses', status: 'Off-plan', completionDate: 'Q2 2027',
    feeLabel: 'ADM Registration Fee', feePct: 2, feeFixed: 625,
    utilityAmount: 42000, parkingCost: 0,
    bookingToken: 20000, day7Payment: 30000,
    primaryColor: '#7B3F1A', secondaryColor: '#D4A88A',
    dpSplitOptions: [1, 3],
    disclaimer: 'Prices are subject to change. This offer is valid for 7 days.',
    whyBuy: [
      'Gated community',
      'Italian inspired design',
      'Prime Abu Dhabi location',
      'Flexible payment plans',
      'Family amenities',
    ],
    heroImage: null, masterPlan: null, floorPlans: {},
    unitTypes: [
      {
        id: 'ut4', label: '3BR',
        subtypes: ['Middle', 'Corner'],
        paymentPlans: clonePlans(),
        floorPlans: {},
      },
      {
        id: 'ut5', label: '4BR',
        subtypes: ['End Unit'],
        paymentPlans: clonePlans(),
        floorPlans: {},
      },
    ],
  },
  {
    id: 'p3', name: 'BRABUS Residences', location: 'Abu Dhabi BRABUS',
    type: 'Apartments', status: 'Off-plan', completionDate: 'Q1 2028',
    feeLabel: 'ADM Registration Fee', feePct: 2, feeFixed: 5250,
    utilityAmount: 42000, parkingCost: 100000,
    bookingToken: 20000, day7Payment: 30000,
    primaryColor: '#1A1A1A', secondaryColor: '#C9A84C',
    dpSplitOptions: [1, 3],
    disclaimer: 'Prices are subject to change. This offer is valid for 7 days.',
    whyBuy: [
      'Worlds first BRABUS branded residences',
      'Ultra-luxury finishes',
      'BRABUS performance lifestyle',
      'Limited edition units',
      'Strong capital appreciation',
    ],
    heroImage: null, masterPlan: null, floorPlans: {},
    unitTypes: [
      {
        id: 'ut6', label: '1BR',
        subtypes: ['BRABUS Edition'],
        paymentPlans: [
          {
            id: 'bp1', planType: 'normal',
            label: '40% DP + 1% Monthly',
            dp: 40, installmentPct: 1, onHandover: 0,
            durationType: 'till_handover', durationMonths: null,
            discount: 18,
            eventName: 'BRABUS World Launch', eventDiscount: 25,
            eventInstallmentPct: 0.5,
            eventDurationType: 'till_handover', eventDurationMonths: null,
          },
        ],
        floorPlans: {},
      },
      {
        id: 'ut7', label: '2BR',
        subtypes: ['BRABUS Edition'],
        paymentPlans: [
          {
            id: 'bp2', planType: 'normal',
            label: '40% DP + 1% Monthly',
            dp: 40, installmentPct: 1, onHandover: 0,
            durationType: 'till_handover', durationMonths: null,
            discount: 18,
            eventName: 'BRABUS World Launch', eventDiscount: 25,
            eventInstallmentPct: 0.5,
            eventDurationType: 'till_handover', eventDurationMonths: null,
          },
        ],
        floorPlans: {},
      },
      {
        id: 'ut8', label: '3BR',
        subtypes: ['BRABUS Penthouse'],
        paymentPlans: [
          {
            id: 'bp3', planType: 'normal',
            label: '50% DP Premium',
            dp: 50, installmentPct: 0, onHandover: 50,
            durationType: 'till_handover', durationMonths: null,
            discount: 10,
            eventName: '', eventDiscount: null,
            eventInstallmentPct: null,
            eventDurationType: 'till_handover', eventDurationMonths: null,
          },
        ],
        floorPlans: {},
      },
    ],
  },
]
