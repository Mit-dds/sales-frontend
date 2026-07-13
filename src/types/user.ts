export type UserRole = 'admin' | 'agent'

export interface User {
  id: string
  name: string
  email: string
  password: string
  phone: string
  profileEmail: string
  role: UserRole
  approved: boolean
  photo: string | null
  watermark: string | null
  status?: string
}
