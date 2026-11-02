import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { env } from '../lib/env'
import type { Profile } from '../types/domain'
import { demoUserProfile } from '../data/demo/demoData'

type AuthContextValue = {
  user: Profile | null
  loading: boolean
  isDemo: boolean
  configurationError: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(() =>
    env.demoMode ? demoUserProfile() : null,
  )
  const [loading, setLoading] = useState(!env.demoMode)
  const [configurationError, setConfigurationError] = useState<string | null>(null)

  useEffect(() => {
    if (env.demoMode) {
      setUser(demoUserProfile())
      setLoading(false)
      return
    }

    // Supabase session hydration is wired in Task 7. Until then, never
    // pretend a user is signed in when credentials are absent.
    setUser(null)
    setLoading(false)
    setConfigurationError(
      env.supabaseUrl
        ? null
        : 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isDemo: env.demoMode,
      configurationError,
      signOut: async () => {
        setUser(null)
      },
    }),
    [configurationError, loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
