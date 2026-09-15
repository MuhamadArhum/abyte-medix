import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  username: string
  fullName: string
  role: string
  permissions: { module: string; action: string; granted: boolean }[]
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  /** True once the persisted session has been read back from localStorage. */
  hasHydrated: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  setTokens: (accessToken: string, refreshToken: string | null) => void
  logout: () => void
  isAuthenticated: () => boolean
  hasPermission: (module: string, action: string) => boolean
  setHasHydrated: (v: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hasHydrated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),

      setTokens: (accessToken, refreshToken) =>
        set((s) => ({ accessToken, refreshToken: refreshToken ?? s.refreshToken })),

      logout: () => set({ user: null, accessToken: null, refreshToken: null }),

      isAuthenticated: () => !!get().accessToken && !!get().user,

      hasPermission: (module, action) => {
        const { user } = get()
        if (!user) return false
        if (user.role === 'ADMIN') return true
        const perm = user.permissions.find((p) => p.module === module && p.action === action)
        return perm?.granted ?? false
      },

      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: 'abyte-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)
