import axios from 'axios'
import { useAuthStore } from '../store/auth.store'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'

export const api = axios.create({ baseURL: BASE_URL })

/** Extract a human-readable message from an API error response */
export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (typeof data?.message === 'string') return data.message
    if (Array.isArray(data?.message)) return data.message.join(', ')
    if (typeof data?.error === 'string') return data.error
    if (error.response?.status === 429) return 'Too many attempts. Please wait a minute.'
    if (error.response?.status === 403) return 'You do not have permission for this action.'
    if (error.response?.status === 404) return 'Record not found.'
    if (error.message) return error.message
  }
  return 'An unexpected error occurred.'
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        useAuthStore.getState().setTokens(data.accessToken, refreshToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)
