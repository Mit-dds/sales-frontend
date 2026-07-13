import type { ColumnMap, ParseResult } from '../types'
import { normCity, matchProject } from './match-project'
import type { ProjectMatch } from './match-project'
import type { Unit } from '@/types'

export function detectHeaders(headers: string[]): ColumnMap {
  const colMap: ColumnMap = {}
  headers.forEach((cell, ci) => {
    const n = String(cell).toLowerCase().replace(/[\s_-]/g, '').replace(/#/g, '')
    if (n === 'city' || n === 'location') colMap.city = ci
    else if (n.indexOf('projectname') >= 0 || n === 'project') colMap.project = ci
    else if (n.indexOf('unitno') >= 0 || n === 'unitno' || n === 'unit') colMap.num = ci
    else if (n.indexOf('propertytype') >= 0) colMap.propType = ci
    else if (n.indexOf('unittype') >= 0 || n === 'type') colMap.type = ci
    else if (n.indexOf('subtype') >= 0 || n === 'sub') colMap.subtype = ci
    else if (n.indexOf('placement') >= 0) colMap.placement = ci
    else if (n === 'floor' || n === 'level') colMap.floor = ci
    else if (n.indexOf('internal') >= 0) colMap.internal = ci
    else if (n.indexOf('external') >= 0 || n.indexOf('balcony') >= 0) colMap.external = ci
    else if (n.indexOf('total') >= 0) colMap.total = ci
    else if (n.indexOf('price') >= 0) colMap.price = ci
  })
  return colMap
}

export interface RawRow {
  city: string
  project: string
  num: string
  type: string
  subtype: string
  floor: string
  placement: string
  internal: number
  external: number
  total: number
  price: number
}

export function extractRow(row: unknown[], colMap: ColumnMap): RawRow {
  const gv = (key: keyof ColumnMap): string => {
    const idx = colMap[key]
    return idx !== undefined ? String((row as unknown[])[idx] || '').trim() : ''
  }
  const gn = (key: keyof ColumnMap): number => {
    const idx = colMap[key]
    if (idx === undefined) return 0
    return Math.round(parseFloat(String((row as unknown[])[idx] || '0').replace(/[^0-9.]/g, '')) || 0)
  }
  return {
    city: gv('city'),
    project: gv('project'),
    num: gv('num'),
    type: gv('type'),
    subtype: gv('subtype'),
    floor: gv('floor'),
    placement: gv('placement'),
    internal: gn('internal'),
    external: gn('external'),
    total: gn('total'),
    price: gn('price'),
  }
}

export function matchUnitType(
  typeLabel: string,
  unitTypes: Array<{ id: string; label: string }>,
): string | null {
  const utNorm = typeLabel.toLowerCase().replace(/[\s_-]/g, '')
  const matched = unitTypes.find((ut) => {
    const lbl = ut.label.toLowerCase().replace(/[\s_-]/g, '')
    return lbl === utNorm || utNorm.indexOf(lbl) >= 0 || lbl.indexOf(utNorm) >= 0 ||
      (utNorm.replace(/[^0-9]/g, '') === lbl.replace(/[^0-9]/g, '') && utNorm.replace(/[^0-9]/g, '').length > 0)
  })
  return matched ? matched.id : null
}

export function parseAvailabilitySheet(
  rows: unknown[][],
  projects: ProjectMatch[],
  existingUnitTypes: Record<string, Array<{ id: string; label: string }>>,
): { units: Unit[]; result: ParseResult } {
  let headerRowIdx = -1
  for (let ri = 0; ri < Math.min(5, rows.length); ri++) {
    const rowStr = rows[ri].map((c) => String(c).toLowerCase()).join('|')
    if (rowStr.indexOf('city') >= 0 || rowStr.indexOf('project name') >= 0 || rowStr.indexOf('unit no') >= 0) {
      headerRowIdx = ri
      break
    }
  }
  if (headerRowIdx < 0) headerRowIdx = 0

  const headerRow = rows[headerRowIdx] as string[]
  const colMap = detectHeaders(headerRow)

  const dataRows = rows.slice(headerRowIdx + 1)
  const units: Unit[] = []
  let added = 0
  let skipped = 0
  const errors: string[] = []
  const byCity: Record<string, number> = {}

  for (const row of dataRows) {
    const raw = extractRow(row as unknown[], colMap)
    if (!raw.num || raw.num.length < 2) { skipped++; continue }
    const proj = matchProject(normCity(raw.city), raw.project, projects)
    if (!proj) { errors.push(`Unit ${raw.num}: project not matched`); skipped++; continue }
    if (raw.price < 10000) { skipped++; continue }

    const typeId = existingUnitTypes[proj.id]
      ? matchUnitType(raw.type, existingUnitTypes[proj.id])
      : null

    units.push({
      id: `u_${raw.num.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`,
      projectId: proj.id,
      number: raw.num,
      typeId: typeId ?? (existingUnitTypes[proj.id]?.[0]?.id ?? ''),
      subtype: raw.subtype,
      floor: isNaN(+raw.floor) ? raw.floor : +raw.floor || 0,
      areaInternal: raw.internal,
      areaExternal: raw.external,
      area: raw.total || (raw.internal + raw.external),
      price: raw.price,
    })
    byCity[raw.city || 'Unknown'] = (byCity[raw.city || 'Unknown'] || 0) + 1
    added++
  }

  return {
    units,
    result: { added, skipped, errors, byCity },
  }
}
