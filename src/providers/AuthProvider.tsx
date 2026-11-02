import type { User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadProfile, signOut as signOutWithSupabase } from '../lib/auth'
import { env } from '../lib/env'
import { supabase } from '../lib/supabase'
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
  const [configurationError, setConfigurationError] = useState<string | null>(
    env.demoMode
      ? null
      : 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )

  useEffect(() => {
    if (env.demoMode) {
      setUser(demoUserProfile())
      setLoading(false)
      setConfigurationError(null)
      return
    }

    if (!supabase) {
      setUser(null)
      setLoading(false)
      setConfigurationError(
        'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      )
      return
    }

    let active = true

    async function hydrate(nextUser: User) {
      try {
        const profile = await loadProfile(nextUser)
        if (active) {
          setUser(profile)
          setConfigurationError(null)
        }
      } catch (reason) {
        if (active) {
          setConfigurationError(
            reason instanceof Error ? reason.message : 'Could not load your profile.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        if (data.session?.user) {
          void hydrate(data.session.user)
        } else {
          setLoading(false)
        }
      })
      .catch(() => {
        if (!active) return
        setLoading(false)
        setConfigurationError('Could not reach Supabase. Check the project URL and anon key.')
      })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      if (session?.user) {
        setLoading(true)
        window.setTimeout(() => {
          if (active && session.user) void hydrate(session.user)
        }, 0)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isDemo: env.demoMode,
      configurationError,
      signOut: async () => {
        await signOutWithSupabase()
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
