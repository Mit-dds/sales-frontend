import { createContext, useContext, useCallback, useEffect, type ReactNode } from 'react'
import type { User } from '@/types'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { apiClient } from '@/lib/api/apiClient'
import axios from 'axios'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  signIn: (emailOrPhone: string, password: string) => Promise<User>
  signOut: () => void
  updateUser: (updated: User) => void
  updateProfile: (data: { name?: string; photo?: File | null; watermark?: File | null }) => Promise<User>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const setUser = useAuthStore((state) => state.setUser)
  const setToken = useAuthStore((state) => state.setToken)
  const setRefreshToken = useAuthStore((state) => state.setRefreshToken)
  const setIsLoading = useAuthStore((state) => state.setIsLoading)
  const storeSignOut = useAuthStore((state) => state.signOut)

  useEffect(() => {
    async function fetchMe() {
      const token = useAuthStore.getState().token
      if (!token) {
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      try {
        const response = await apiClient.get<{
          success: boolean
          data: User
        }>('auth/me')
        setUser(response.data.data)
      } catch (err) {
        // Log the error but do not automatically log the user out
        console.error('Failed to fetch current user profile:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMe()
  }, [setUser, setIsLoading, storeSignOut])

  const signIn = useCallback(async (emailOrPhone: string, password: string) => {
    const isEmail = emailOrPhone.includes('@')
    const payload = {
      email: isEmail ? emailOrPhone.trim().toLowerCase() : undefined,
      phone: !isEmail ? emailOrPhone.trim() : undefined,
      password,
    }

    try {
      const response = await apiClient.post<{
        success: boolean
        message: string
        data: {
          user: User
          accessToken: string
          refreshToken: string
        }
      }>('auth/login', payload)

      const { user: userData, accessToken, refreshToken } = response.data.data
      setUser(userData)
      setToken(accessToken)
      setRefreshToken(refreshToken)
      return userData
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        // Pass the error response object back to the caller
        throw err.response.data
      }
      throw { success: false, message: 'An unexpected network error occurred.' }
    }
  }, [setUser, setToken, setRefreshToken])

  const signOut = useCallback(async () => {
    try {
      await apiClient.post('auth/logout')
    } catch {
      // Ignore network errors and continue client cleanup
    } finally {
      storeSignOut()
    }
  }, [storeSignOut])

  const updateUser = useCallback((updated: User) => {
    setUser(updated)
  }, [setUser])

  const updateProfile = useCallback(async (data: { name?: string; photo?: File | null; watermark?: File | null }) => {
    const formData = new FormData()
    if (data.name !== undefined) formData.append('name', data.name)
    if (data.photo === null) {
      formData.append('photo', '')
    } else if (data.photo) {
      formData.append('photo', data.photo)
    }
    if (data.watermark === null) {
      formData.append('watermark', '')
    } else if (data.watermark) {
      formData.append('watermark', data.watermark)
    }

    const response = await apiClient.put<{
      success: boolean
      data: User
    }>('auth/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const updatedUser = response.data.data
    setUser(updatedUser)
    return updatedUser
  }, [setUser])

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, updateUser, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
