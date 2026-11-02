import { useQuery } from '@tanstack/react-query'
import { useDataProvider } from '../data/provider'

export function useCategories(workspaceId: string | null | undefined) {
  const provider = useDataProvider()

  return useQuery({
    queryKey: ['categories', workspaceId],
    queryFn: () => provider.listCategories(workspaceId as string),
    enabled: Boolean(workspaceId),
  })
}
