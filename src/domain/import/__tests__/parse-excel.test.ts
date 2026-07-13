import { describe, it, expect } from 'vitest'
import { detectHeaders, extractRow, matchUnitType, parseAvailabilitySheet } from '../parse-excel'

describe('detectHeaders', () => {
  it('detects standard column headers', () => {
    const headers = ['City', 'Project Name', 'Unit No', 'Type', 'Sub Type', 'Floor', 'Internal', 'External', 'Total', 'Price']
    const map = detectHeaders(headers)
    expect(map.city).toBe(0)
    expect(map.project).toBe(1)
    expect(map.num).toBe(2)
    expect(map.type).toBe(3)
    expect(map.subtype).toBe(4)
    expect(map.floor).toBe(5)
    expect(map.internal).toBe(6)
    expect(map.external).toBe(7)
    expect(map.total).toBe(8)
    expect(map.price).toBe(9)
  })

  it('handles alternative column names', () => {
    const headers = ['Location', 'Project', 'Unit #', 'Unit Type', 'Sub', 'Level', 'Internal Area', 'Balcony', 'Total Area', 'Price (AED)']
    const map = detectHeaders(headers)
    expect(map.city).toBe(0)
    expect(map.project).toBe(1)
    expect(map.num).toBe(2)
    expect(map.type).toBe(3)
    expect(map.subtype).toBe(4)
    expect(map.floor).toBe(5)
    expect(map.internal).toBe(6)
    expect(map.external).toBe(7)
    expect(map.total).toBe(8)
    expect(map.price).toBe(9)
  })

  it('returns empty map for no matching headers', () => {
    const map = detectHeaders(['A', 'B', 'C'])
    expect(Object.keys(map).length).toBe(0)
  })
})

describe('extractRow', () => {
  it('extracts values from a row', () => {
    const colMap = { city: 0, project: 1, num: 2, type: 3, price: 9 }
    const row = ['Dubai', 'Sapphire Towers', 'A101', '1 Bedroom', '', '', '', '', '', '500000']
    const raw = extractRow(row, colMap)
    expect(raw.city).toBe('Dubai')
    expect(raw.project).toBe('Sapphire Towers')
    expect(raw.num).toBe('A101')
    expect(raw.type).toBe('1 Bedroom')
    expect(raw.price).toBe(500000)
  })
})

describe('matchUnitType', () => {
  const unitTypes = [
    { id: 'ut1', label: '1 Bedroom' },
    { id: 'ut2', label: '2 Bedroom' },
    { id: 'ut3', label: '3 Bedroom' },
  ]

  it('matches exact label', () => {
    expect(matchUnitType('1 Bedroom', unitTypes)).toBe('ut1')
  })

  it('matches with whitespace normalization', () => {
    expect(matchUnitType(' 2-Bedroom ', unitTypes)).toBe('ut2')
  })

  it('returns null for no match', () => {
    expect(matchUnitType('Studio', unitTypes)).toBeNull()
  })
})

describe('parseAvailabilitySheet', () => {
  it('parses sheet rows into units', () => {
    const projects = [
      { id: 'p1', name: 'Sapphire Towers', location: 'Dubai' },
    ]
    const existingUnitTypes: Record<string, Array<{ id: string; label: string }>> = {
      p1: [{ id: 'ut1', label: '1 Bedroom' }],
    }
    const rows: unknown[][] = [
      ['City', 'Project Name', 'Unit No', 'Type', 'Sub Type', 'Floor', 'Internal', 'External', 'Total', 'Price'],
      ['Dubai', 'Sapphire Towers', 'A101', '1 Bedroom', '', 'G', '800', '100', '900', '500000'],
      ['Dubai', 'Sapphire Towers', 'A102', '1 Bedroom', '', '1', '850', '120', '970', '520000'],
    ]
    const { units, result } = parseAvailabilitySheet(rows, projects, existingUnitTypes)
    expect(units).toHaveLength(2)
    expect(units[0].number).toBe('A101')
    expect(units[1].number).toBe('A102')
    expect(result.added).toBe(2)
    expect(result.skipped).toBe(0)
  })

  it('skips rows with no unit number', () => {
    const projects = [{ id: 'p1', name: 'Sapphire Towers', location: 'Dubai' }]
    const rows: unknown[][] = [
      ['City', 'Project Name', 'Unit No', 'Price'],
      ['Dubai', 'Sapphire Towers', '', '500000'],
    ]
    const { units, result } = parseAvailabilitySheet(rows, projects, {})
    expect(units).toHaveLength(0)
    expect(result.skipped).toBe(1)
  })

  it('skips rows with price < 10000', () => {
    const projects = [{ id: 'p1', name: 'Sapphire Towers', location: 'Dubai' }]
    const existingUnitTypes: Record<string, Array<{ id: string; label: string }>> = {
      p1: [{ id: 'ut1', label: '1 Bedroom' }],
    }
    const rows: unknown[][] = [
      ['City', 'Project Name', 'Unit No', 'Price'],
      ['Dubai', 'Sapphire Towers', 'A101', '5000'],
    ]
    const { units, result } = parseAvailabilitySheet(rows, projects, existingUnitTypes)
    expect(units).toHaveLength(0)
    expect(result.skipped).toBe(1)
  })
})
