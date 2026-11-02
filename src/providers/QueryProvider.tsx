import { QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import type { ReactNode } from 'react'
import { queryClient } from '../lib/queryClient'
import { persistedQueryOptions } from '../lib/queryPersistence'

const canPersist = typeof indexedDB !== 'undefined'

export function QueryProvider({ children }: { children: ReactNode }) {
  if (!canPersist) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistedQueryOptions}>
      {children}
    </PersistQueryClientProvider>
  )
}
