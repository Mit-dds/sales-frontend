import type { User } from '@/types'

export const INITIAL_USERS: User[] = [
  {
    id: 'u1', name: 'Admin', email: 'admin@reportage.ae',
    password: 'admin123', phone: '', profileEmail: 'admin@reportage.ae',
    role: 'admin', approved: true, photo: null, watermark: null,
  },
  {
    id: 'u2', name: 'Shuja', email: 'shuja@reportage.ae',
    password: 'agent123', phone: '', profileEmail: 'shuja@reportage.ae',
    role: 'agent', approved: true, photo: null, watermark: null,
  },
]
