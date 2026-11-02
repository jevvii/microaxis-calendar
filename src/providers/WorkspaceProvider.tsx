import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDataProvider } from '../data/provider'
import type { Team, Workspace, WorkspaceMembership } from '../types/domain'
import { useAuth } from './AuthProvider'

const ACTIVE_WORKSPACE_KEY = 'microaxis-active-workspace'

type WorkspaceContextValue = {
  workspaces: Workspace[]
  teams: Team[]
  members: WorkspaceMembership[]
  activeWorkspace: Workspace | null
  activeWorkspaceId: string | null
  membership: WorkspaceMembership | null
  loading: boolean
  error: string | null
  setActiveWorkspaceId: (workspaceId: string) => void
  refresh: () => void
  upsertTeam: (team: Team) => void
  removeTeam: (teamId: string) => void
  upsertMember: (membership: WorkspaceMembership) => void
  removeMember: (userId: string) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const provider = useDataProvider()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [members, setMembers] = useState<WorkspaceMembership[]>([])
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : window.localStorage.getItem(ACTIVE_WORKSPACE_KEY),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!user) {
      setWorkspaces([])
      setTeams([])
      setMembers([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    provider
      .listWorkspaces()
      .then((items) => {
        if (cancelled) return
        setWorkspaces(items)
        const storedId = window.localStorage.getItem(ACTIVE_WORKSPACE_KEY)
        const selected =
          items.find((item) => item.id === storedId) ??
          items.find((item) => item.id === activeWorkspaceId) ??
          items[0] ??
          null

        if (selected) {
          setActiveWorkspaceIdState(selected.id)
          window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, selected.id)
        } else {
          setActiveWorkspaceIdState(null)
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Could not load workspaces.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId, provider, reloadKey, user])

  useEffect(() => {
    if (!activeWorkspaceId || !user) {
      setTeams([])
      setMembers([])
      return
    }

    let cancelled = false
    Promise.all([
      provider.listTeams(activeWorkspaceId),
      provider.listMembers(activeWorkspaceId),
    ])
      .then(([nextTeams, nextMembers]) => {
        if (cancelled) return
        setTeams(nextTeams)
        setMembers(nextMembers)
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Could not load workspace details.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId, provider, reloadKey, user])

  const setActiveWorkspaceId = useCallback(
    (workspaceId: string) => {
      queryClient.clear()
      setActiveWorkspaceIdState(workspaceId)
      window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId)
    },
    [queryClient],
  )

  const refresh = useCallback(() => setReloadKey((key) => key + 1), [])

  const upsertTeam = useCallback((team: Team) => {
    setTeams((current) => {
      const exists = current.some((item) => item.id === team.id)
      const next = exists
        ? current.map((item) => (item.id === team.id ? team : item))
        : [...current, team]
      return next.sort((a, b) => a.name.localeCompare(b.name))
    })
  }, [])

  const removeTeam = useCallback((teamId: string) => {
    setTeams((current) => current.filter((team) => team.id !== teamId))
  }, [])

  const upsertMember = useCallback((membership: WorkspaceMembership) => {
    setMembers((current) => {
      const exists = current.some((item) => item.userId === membership.userId)
      return exists
        ? current.map((item) => (item.userId === membership.userId ? membership : item))
        : [...current, membership]
    })
  }, [])

  const removeMember = useCallback((userId: string) => {
    setMembers((current) => current.filter((member) => member.userId !== userId))
  }, [])

  const value = useMemo<WorkspaceContextValue>(() => {
    const activeWorkspace = workspaces.find((item) => item.id === activeWorkspaceId) ?? null
    const membership =
      members.find((item) => item.userId === user?.id && item.workspaceId === activeWorkspaceId) ??
      null

    return {
      workspaces,
      teams,
      members,
      activeWorkspace,
      activeWorkspaceId,
      membership,
      loading,
      error,
      setActiveWorkspaceId,
      refresh,
      upsertTeam,
      removeTeam,
      upsertMember,
      removeMember,
    }
  }, [
    activeWorkspaceId,
    error,
    loading,
    members,
    removeMember,
    removeTeam,
    setActiveWorkspaceId,
    teams,
    upsertMember,
    upsertTeam,
    user?.id,
    workspaces,
    refresh,
  ])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return context
}
