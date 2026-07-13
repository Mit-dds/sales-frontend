import type { User } from '@/types'
import { storage, STORAGE_KEYS } from '@/lib/storage'
import { usersService } from './users.service'

export const authService = {
  signIn(emailOrPhone: string, password: string): User | null {
    const user = usersService.signIn(emailOrPhone, password)
    if (user) storage.set(STORAGE_KEYS.CURRENT_USER, user)
    return user
  },

  signOut(): void {
    storage.remove(STORAGE_KEYS.CURRENT_USER)
  },

  getSession(): User | null {
    return storage.get<User>(STORAGE_KEYS.CURRENT_USER)
  },

  updateSession(user: User): void {
    storage.set(STORAGE_KEYS.CURRENT_USER, user)
  },

  register(name: string, email: string, password: string, phone: string, profileEmail: string): User {
    const newUser: User = {
      id: 'u_' + Date.now(),
      name,
      email,
      password,
      phone: phone || '',
      profileEmail: profileEmail || email,
      role: 'agent',
      approved: false,
      photo: null,
      watermark: null,
    }
    return usersService.register(newUser)
  },
}
