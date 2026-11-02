import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { del, get, set } from 'idb-keyval'

export const queryPersister = createAsyncStoragePersister({
  key: 'microaxis-query-cache-v1',
  storage: {
    getItem: async (key) => {
      const value = await get<string>(key)
      return value ?? null
    },
    setItem: async (key, value) => {
      await set(key, value)
    },
    removeItem: async (key) => {
      await del(key)
    },
  },
})

export const persistedQueryOptions = {
  persister: queryPersister,
  maxAge: 86_400_000,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { queryKey: readonly unknown[] }) =>
      query.queryKey[0] === 'events',
  },
}
