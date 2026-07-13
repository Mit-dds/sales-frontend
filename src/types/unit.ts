export interface Unit {
  id: string
  number: string
  projectId: string
  typeId: string
  floor: number | string
  areaInternal: number
  areaExternal: number
  area: number
  price: number
  subtype?: string
  isGhost?: boolean
  createdBy?: string
}

export interface UnitImport {
  city: string
  projectName: string
  propertyType: string
  unitType: string
  subtype: string
  unitNumber: string
  floor: string
  areaInternal: number
  areaExternal: number
  areaTotal: number
  price: number
  placement?: string
}
