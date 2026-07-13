import type { Unit } from '@/types'
import { storage, STORAGE_KEYS } from '@/lib/storage'
import { INITIAL_UNITS, type UnitsMap } from '@/mocks'

export const unitsService = {
  getAllMap(): UnitsMap {
    const stored = storage.get<UnitsMap>(STORAGE_KEYS.UNITS)
    if (!stored) {
      storage.set(STORAGE_KEYS.UNITS, INITIAL_UNITS)
      return INITIAL_UNITS
    }
    return stored
  },

  getByProject(projectId: string): Unit[] {
    return this.getAllMap()[projectId] || []
  },

  create(unit: Unit): void {
    const map = this.getAllMap()
    if (!map[unit.projectId]) map[unit.projectId] = []
    map[unit.projectId].push(unit)
    storage.set(STORAGE_KEYS.UNITS, map)
  },

  delete(projectId: string, unitId: string): void {
    const map = this.getAllMap()
    if (map[projectId]) {
      map[projectId] = map[projectId].filter(u => u.id !== unitId)
      storage.set(STORAGE_KEYS.UNITS, map)
    }
  },

  replaceAll(projectId: string, units: Unit[]): void {
    const map = this.getAllMap()
    map[projectId] = units
    storage.set(STORAGE_KEYS.UNITS, map)
  },
}
