import { describe, it, expect } from 'vitest'
import { normCity, lev, fuzzyWordMatch, normSuffix, matchProject } from '../match-project'

describe('normCity', () => {
  it('normalizes Dubai', () => {
    expect(normCity('Dubai')).toBe('dubai')
    expect(normCity('dubai marina')).toBe('dubai')
  })

  it('normalizes Abu Dhabi', () => {
    expect(normCity('Abu Dhabi')).toBe('abudhabi')
    expect(normCity('AbuDhabi')).toBe('abudhabi')
  })

  it('normalizes BRABUS', () => {
    expect(normCity('BRABUS')).toBe('brabus')
  })

  it('passes through other cities', () => {
    expect(normCity('Ras Al Khaimah')).toBe('rasalkhaimah')
  })
})

describe('lev', () => {
  it('returns 0 for identical strings', () => {
    expect(lev('hello', 'hello')).toBe(0)
  })

  it('returns correct distance for single char diff', () => {
    expect(lev('hello', 'hallo')).toBe(1)
  })

  it('handles empty strings', () => {
    expect(lev('', 'abc')).toBe(3)
    expect(lev('abc', '')).toBe(3)
  })
})

describe('fuzzyWordMatch', () => {
  it('matches identical words', () => {
    expect(fuzzyWordMatch('hello', 'hello')).toBe(true)
  })

  it('rejects different word lengths', () => {
    expect(fuzzyWordMatch('hello', 'hello world')).toBe(false)
  })

  it('allows 1 typo for long words', () => {
    expect(fuzzyWordMatch('residence', 'residense')).toBe(true)
  })

  it('rejects 2 typos', () => {
    expect(fuzzyWordMatch('residence', 'risidense')).toBe(false)
  })

  it('requires exact match for numbers', () => {
    expect(fuzzyWordMatch('phase1', 'phase1')).toBe(true)
    expect(fuzzyWordMatch('phase1', 'phase2')).toBe(false)
  })
})

describe('normSuffix', () => {
  it('normalizes residences -> residence', () => {
    expect(normSuffix('greenresidences')).toBe('greenresidence')
  })

  it('normalizes towers -> tower', () => {
    expect(normSuffix('sapphiretowers')).toBe('sapphiretower')
  })

  it('normalizes villas -> villa', () => {
    expect(normSuffix('oceanvillas')).toBe('oceanvilla')
  })
})

describe('matchProject', () => {
  const projects = [
    { id: 'p1', name: 'Sapphire Towers', location: 'Dubai' },
    { id: 'p2', name: 'Green Residence', location: 'Abu Dhabi' },
    { id: 'p3', name: 'Ocean Villas', location: 'Ras Al Khaimah' },
    { id: 'p4', name: 'Brabus Tower 1', location: 'BRABUS' },
  ]

  it('matches exact project name in correct city', () => {
    const result = matchProject('dubai', 'Sapphire Towers', projects)
    expect(result).not.toBeNull()
    expect(result!.id).toBe('p1')
  })

  it('matches fuzzy project name', () => {
    const result = matchProject('dubai', 'Saphire Towers', projects)
    expect(result).not.toBeNull()
    expect(result!.id).toBe('p1')
  })

  it('returns null for non-matching city', () => {
    const result = matchProject('dubai', 'Green Residence', projects)
    expect(result).toBeNull()
  })

  it('matches BRABUS city', () => {
    const result = matchProject('brabus', 'Brabus Tower 1', projects)
    expect(result).not.toBeNull()
    expect(result!.id).toBe('p4')
  })

  it('returns null for empty project list', () => {
    const result = matchProject('dubai', 'Anything', [])
    expect(result).toBeNull()
  })
})
