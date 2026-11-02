import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { env } from '../lib/env'
import type { DataProvider } from './types'
import { createDemoProvider } from './demo/demoProvider'

const DataProviderContext = createContext<DataProvider | null>(null)

function createUnconfiguredProvider(): DataProvider {
  const notConfigured = async (): Promise<never> => {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.',
    )
  }

  return {
    mode: 'supabase',
    listWorkspaces: notConfigured,
    createWorkspace: notConfigured,
    listTeams: notConfigured,
    listMembers: notConfigured,
    listCalendars: notConfigured,
    listCategories: notConfigured,
    listEvents: notConfigured,
    createEvent: notConfigured,
    updateEvent: notConfigured,
    deleteEvent: notConfigured,
    listNotifications: notConfigured,
    markNotificationRead: notConfigured,
  }
}

export function DataProviderProvider({ children }: { children: ReactNode }) {
  const provider = useMemo(
    () => (env.demoMode ? createDemoProvider() : createUnconfiguredProvider()),
    [],
  )

  return <DataProviderContext.Provider value={provider}>{children}</DataProviderContext.Provider>
}

export function useDataProvider() {
  const context = useContext(DataProviderContext)
  if (!context) throw new Error('useDataProvider must be used inside DataProviderProvider')
  return context
}
