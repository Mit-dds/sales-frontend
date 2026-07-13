import { describe, it, expect, beforeEach } from 'vitest'
import { usersService } from '@/services/users.service'

beforeEach(() => localStorage.clear())

describe('usersService', () => {
  it('returns all users', () => {
    const users = usersService.getAll()
    expect(users.length).toBeGreaterThanOrEqual(2)
  })

  it('finds user by email', () => {
    const user = usersService.getByEmail('admin@reportage.ae')
    expect(user).not.toBeNull()
    expect(user!.role).toBe('admin')
  })

  it('updates a user', () => {
    const user = usersService.getAll()[0]
    usersService.update({ ...user, name: 'Renamed' })
    const updated = usersService.getByEmail(user.email)
    expect(updated!.name).toBe('Renamed')
  })

  it('approves a user', () => {
    const newUser = usersService.register({
      id: 'test', name: 'Test', email: 'test@test.ae', password: 'p',
      phone: '', profileEmail: '', role: 'agent', approved: false,
      photo: null, watermark: null,
    })
    usersService.approve(newUser.id)
    expect(usersService.getByEmail('test@test.ae')!.approved).toBe(true)
  })

  it('rejects (removes) a user', () => {
    const newUser = usersService.register({
      id: 'test2', name: 'Test2', email: 'test2@test.ae', password: 'p',
      phone: '', profileEmail: '', role: 'agent', approved: false,
      photo: null, watermark: null,
    })
    usersService.reject(newUser.id)
    expect(usersService.getByEmail('test2@test.ae')).toBeUndefined()
  })

  it('signs in with exact email match', () => {
    const user = usersService.signIn('admin@reportage.ae', 'admin123')
    expect(user).not.toBeNull()
  })
})
