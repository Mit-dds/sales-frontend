import { create } from 'zustand'
import { storage } from '@/lib/storage'

export interface ImportedUnit {
  id: string
  number: string
  type: string
  subtype?: string
  floor: string | number
  internal: number
  external: number
  total: number
  price: number
}

export interface ImportedProject {
  projectId: string
  projectName: string
  unitCount: number
  units: ImportedUnit[]
}

export interface ImportSummary {
  totalImported: number
  totalSkipped: number
}

interface ParseResultData {
  added: number
  skipped: number
  errors: string[]
  byCity: Record<string, number>
}

interface AvailabilityState {
  projects: ImportedProject[]
  summary: ImportSummary | null
  parseResult: {
    result: ParseResultData
    filename: string
  } | null
  setImportData: (
    projects: ImportedProject[],
    summary: ImportSummary,
    filename: string
  ) => void
  clearImportData: () => void
}

const STORAGE_KEY_AVAILABILITY = 'reportage_availability_store'

const getInitialData = () => {
  try {
    const saved = storage.get<{
      projects: ImportedProject[]
      summary: ImportSummary | null
      parseResult: { result: ParseResultData; filename: string } | null
    }>(STORAGE_KEY_AVAILABILITY)
    return saved || { projects: [], summary: null, parseResult: null }
  } catch {
    return { projects: [], summary: null, parseResult: null }
  }
}

const initial = getInitialData()

export const useAvailabilityStore = create<AvailabilityState>((set) => ({
  projects: initial.projects,
  summary: initial.summary,
  parseResult: initial.parseResult,

  setImportData: (projects, summary, filename) => {
    const byCity: Record<string, number> = {}
    let totalImported = 0

    projects.forEach((proj) => {
      const city = proj.projectName || 'Default'
      byCity[city] = proj.units.length
      totalImported += proj.units.length
    })

    const parseResult = {
      result: {
        added: summary.totalImported || totalImported,
        skipped: summary.totalSkipped || 0,
        errors: [],
        byCity,
      },
      filename,
    }

    const nextState = {
      projects,
      summary,
      parseResult,
    }

    storage.set(STORAGE_KEY_AVAILABILITY, nextState)
    set(nextState)
  },

  clearImportData: () => {
    const nextState = {
      projects: [],
      summary: null,
      parseResult: null,
    }
    storage.remove(STORAGE_KEY_AVAILABILITY)
    set(nextState)
  },
}))
