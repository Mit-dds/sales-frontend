import type { Settings } from '@/types'
import { storage, STORAGE_KEYS } from '@/lib/storage'
import { INITIAL_SETTINGS } from '@/mocks'

export const settingsService = {
  get(): Settings {
    const stored = storage.get<Settings>(STORAGE_KEYS.SETTINGS)
    if (!stored) {
      storage.set(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS)
      return INITIAL_SETTINGS
    }
    return stored
  },

  update(settings: Settings): void {
    storage.set(STORAGE_KEYS.SETTINGS, settings)
  },
}
