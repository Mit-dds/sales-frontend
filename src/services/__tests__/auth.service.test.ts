import { describe, it, expect, beforeEach } from 'vitest'
import { authService } from '@/services/auth.service'

beforeEach(() => localStorage.clear())

describe('authService', () => {
  it('signs in with valid email', () => {
    const user = authService.signIn('admin@reportage.ae', 'admin123')
    expect(user).not.toBeNull()
    expect(user!.name).toBe('Admin')
  })

  it('signs in with valid phone', () => {
    const user = authService.signIn('shuja@reportage.ae', 'agent123')
    expect(user).not.toBeNull()
    expect(user!.name).toBe('Shuja')
  })

  it('returns null for invalid credentials', () => {
    expect(authService.signIn('wrong', 'wrong')).toBeNull()
  })

  it('signs out and clears session', () => {
    authService.signIn('admin@reportage.ae', 'admin123')
    authService.signOut()
    expect(authService.getSession()).toBeNull()
  })

  it('registers a new user', () => {
    const user = authService.register('New Agent', 'new@test.ae', 'pass123', '971500000000', 'new@test.ae')
    expect(user.name).toBe('New Agent')
    expect(user.role).toBe('agent')
    expect(user.approved).toBe(false)
  })

  it('updates session', () => {
    const user = authService.signIn('admin@reportage.ae', 'admin123')
    authService.updateSession({ ...user!, name: 'Updated' })
    expect(authService.getSession()!.name).toBe('Updated')
  })
})
