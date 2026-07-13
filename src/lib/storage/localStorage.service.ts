const isBrowser = typeof window !== 'undefined'

export const storage = {
  get<T>(key: string): T | null {
    if (!isBrowser) return null
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  },

  set<T>(key: string, value: T): void {
    if (!isBrowser) return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      console.error(`Failed to save to localStorage: ${key}`)
    }
  },

  remove(key: string): void {
    if (!isBrowser) return
    try {
      localStorage.removeItem(key)
    } catch {
      console.error(`Failed to remove from localStorage: ${key}`)
    }
  },
}
