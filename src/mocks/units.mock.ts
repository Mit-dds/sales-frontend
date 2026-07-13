import type { Unit } from '@/types'

export interface UnitsMap {
  [projectId: string]: Unit[]
}

export const INITIAL_UNITS: UnitsMap = {
  p1: [
    { id: 'u101', number: '101', projectId: 'p1', typeId: 'ut1', floor: 1, areaInternal: 360, areaExternal: 72, area: 432, price: 660000 },
    { id: 'u202', number: '202', projectId: 'p1', typeId: 'ut2', floor: 2, areaInternal: 680, areaExternal: 98, area: 778, price: 970000 },
    { id: 'u305', number: '305', projectId: 'p1', typeId: 'ut2', floor: 3, areaInternal: 760, areaExternal: 102, area: 862, price: 1050000 },
    { id: 'u410', number: '410', projectId: 'p1', typeId: 'ut3', floor: 4, areaInternal: 1020, areaExternal: 160, area: 1180, price: 1400000 },
  ],
  p2: [
    { id: 'u501', number: 'TH-01', projectId: 'p2', typeId: 'ut4', floor: 'G', areaInternal: 1800, areaExternal: 400, area: 2200, price: 3200000 },
    { id: 'u502', number: 'TH-02', projectId: 'p2', typeId: 'ut4', floor: 'G', areaInternal: 1850, areaExternal: 380, area: 2230, price: 3250000 },
    { id: 'u503', number: 'TH-10', projectId: 'p2', typeId: 'ut5', floor: 'G', areaInternal: 2200, areaExternal: 500, area: 2700, price: 4100000 },
  ],
  p3: [
    { id: 'uB01', number: 'B-101', projectId: 'p3', typeId: 'ut6', floor: 1, areaInternal: 900, areaExternal: 200, area: 1100, price: 2200000 },
    { id: 'uB02', number: 'B-205', projectId: 'p3', typeId: 'ut7', floor: 2, areaInternal: 1200, areaExternal: 250, area: 1450, price: 3500000 },
    { id: 'uB03', number: 'PH-01', projectId: 'p3', typeId: 'ut8', floor: 10, areaInternal: 1900, areaExternal: 800, area: 2700, price: 6800000 },
  ],
}
