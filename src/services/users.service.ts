import type { User } from '@/types'
import { storage, STORAGE_KEYS } from '@/lib/storage'
import { INITIAL_USERS } from '@/mocks'

export const usersService = {
  getAll(): User[] {
    const stored = storage.get<User[]>(STORAGE_KEYS.USERS)
    if (!stored) {
      storage.set(STORAGE_KEYS.USERS, INITIAL_USERS)
      return INITIAL_USERS
    }
    return stored
  },

  getByEmail(email: string): User | undefined {
    return this.getAll().find(u => u.email.toLowerCase() === email.toLowerCase())
  },

  signIn(emailOrPhone: string, password: string): User | null {
    const input = emailOrPhone.toLowerCase()
    const user = this.getAll().find(u =>
      (u.email.toLowerCase() === input ||
       (u.phone && u.phone.replace(/[^0-9]/g, '') === input.replace(/[^0-9]/g, ''))) &&
      u.password === password
    )
    return user || null
  },

  register(user: User): User {
    const users = this.getAll()
    users.push(user)
    storage.set(STORAGE_KEYS.USERS, users)
    return user
  },

  update(user: User): void {
    const users = this.getAll()
    const index = users.findIndex(u => u.id === user.id)
    if (index !== -1) {
      users[index] = user
      storage.set(STORAGE_KEYS.USERS, users)
    }
  },

  approve(id: string): void {
    const user = this.getAll().find(u => u.id === id)
    if (user) {
      user.approved = true
      this.update(user)
    }
  },

  reject(id: string): void {
    const users = this.getAll().filter(u => u.id !== id)
    storage.set(STORAGE_KEYS.USERS, users)
  },
}
