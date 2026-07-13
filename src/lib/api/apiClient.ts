import axios from 'axios'
import { storage } from '@/lib/storage'
import { STORAGE_KEYS } from '@/lib/storage/storageKeys'
import { useAuthStore } from '@/lib/store/useAuthStore'

const rawBaseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/'
const resolvedBaseURL = rawBaseURL.endsWith('/api/')
  ? rawBaseURL
  : rawBaseURL.endsWith('/api')
  ? rawBaseURL + '/'
  : rawBaseURL.endsWith('/')
  ? rawBaseURL + 'api/'
  : rawBaseURL + '/api/';

export const apiClient = axios.create({
  baseURL: resolvedBaseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config) => {
    const token = storage.get<string>(STORAGE_KEYS.TOKEN)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

let isRefreshing = false
let failedQueue: any[] = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Avoid infinite loop if the refresh token path itself gets 401
      if (originalRequest.url === 'auth/refresh') {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return apiClient(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = useAuthStore.getState().refreshToken
      if (!refreshToken) {
        isRefreshing = false
        return Promise.reject(error)
      }

      try {
        const response = await axios.post<{
          success: boolean
          data: {
            accessToken: string
            refreshToken: string
          }
                }>(resolvedBaseURL + 'auth/refresh', {
          refreshToken,
        })

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data
        useAuthStore.getState().setToken(newAccessToken)
        useAuthStore.getState().setRefreshToken(newRefreshToken)

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        processQueue(null, newAccessToken)
        isRefreshing = false

        return apiClient(originalRequest)
      } catch (err) {
        processQueue(err, null)
        isRefreshing = false
        return Promise.reject(err)
      }
    }

    return Promise.reject(error)
  }
)
