import { create } from 'zustand'
import type { User } from '@/types'
import { storage } from '@/lib/storage'
import { STORAGE_KEYS } from '@/lib/storage/storageKeys'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setRefreshToken: (refreshToken: string | null) => void
  setIsLoading: (isLoading: boolean) => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: storage.get<User>(STORAGE_KEYS.CURRENT_USER) || null,
  token: storage.get<string>(STORAGE_KEYS.TOKEN) || null,
  refreshToken: storage.get<string>(STORAGE_KEYS.REFRESH_TOKEN) || null,
  isLoading: !!storage.get<string>(STORAGE_KEYS.TOKEN),

  setUser: (user) => {
    if (user) {
      storage.set(STORAGE_KEYS.CURRENT_USER, user)
    } else {
      storage.remove(STORAGE_KEYS.CURRENT_USER)
    }
    set({ user })
  },

  setToken: (token) => {
    if (token) {
      storage.set(STORAGE_KEYS.TOKEN, token)
    } else {
      storage.remove(STORAGE_KEYS.TOKEN)
    }
    set({ token })
  },

  setRefreshToken: (refreshToken) => {
    if (refreshToken) {
      storage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
    } else {
      storage.remove(STORAGE_KEYS.REFRESH_TOKEN)
    }
    set({ refreshToken })
  },

  setIsLoading: (isLoading) => set({ isLoading }),

  signOut: () => {
    storage.remove(STORAGE_KEYS.CURRENT_USER)
    storage.remove(STORAGE_KEYS.TOKEN)
    storage.remove(STORAGE_KEYS.REFRESH_TOKEN)
    set({ user: null, token: null, refreshToken: null })
  },
}))
