import { describe, it, expect, beforeEach } from 'vitest'
import { settingsService } from '@/services/settings.service'

beforeEach(() => localStorage.clear())

describe('settingsService', () => {
  it('returns default settings', () => {
    const s = settingsService.get()
    expect(s.teamName).toBe('Adil & Shadab Team')
    expect(s.usdRate).toBeGreaterThan(0)
  })

  it('updates settings', () => {
    const s = settingsService.get()
    settingsService.update({ ...s, teamName: 'New Team' })
    expect(settingsService.get().teamName).toBe('New Team')
  })
})
