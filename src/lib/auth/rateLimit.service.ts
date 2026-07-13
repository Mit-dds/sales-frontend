const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 0.5

interface AttemptRecord {
  count: number
  lastAttempt: number
}

const store = new Map<string, AttemptRecord>()

export const rateLimitService = {
  check(key: string): { allowed: boolean; remaining: number; lockedUntil: number | null } {
    const now = Date.now()
    const record = store.get(key)

    if (!record) {
      return { allowed: true, remaining: MAX_ATTEMPTS, lockedUntil: null }
    }

    const elapsed = (now - record.lastAttempt) / 1000 / 60
    if (elapsed >= LOCKOUT_MINUTES) {
      store.delete(key)
      return { allowed: true, remaining: MAX_ATTEMPTS, lockedUntil: null }
    }

    if (record.count >= MAX_ATTEMPTS) {
      const lockedUntil = record.lastAttempt + LOCKOUT_MINUTES * 60 * 1000
      return { allowed: false, remaining: 0, lockedUntil }
    }

    return { allowed: true, remaining: MAX_ATTEMPTS - record.count, lockedUntil: null }
  },

  recordAttempt(key: string): void {
    const now = Date.now()
    const record = store.get(key)
    if (!record || (now - record.lastAttempt) / 1000 / 60 >= LOCKOUT_MINUTES) {
      store.set(key, { count: 1, lastAttempt: now })
    } else {
      store.set(key, { count: record.count + 1, lastAttempt: now })
    }
  },

  reset(key: string): void {
    store.delete(key)
  },
}
