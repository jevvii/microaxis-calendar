import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDataProvider } from '../data/provider'
import type {
  CalendarAdminInput,
  CalendarShareInput,
  TeamAdminInput,
} from '../data/types'
import { useWorkspace } from '../providers/WorkspaceProvider'
import type { WorkspaceRole } from '../types/domain'

export function useWorkspaceAdmin(workspaceId: string | null | undefined) {
  const provider = useDataProvider()
  const queryClient = useQueryClient()
  const { refresh } = useWorkspace()

  function invalidate() {
    refresh()
    void queryClient.invalidateQueries({ queryKey: ['calendars'] })
    void queryClient.invalidateQueries({ queryKey: ['events'] })
    void queryClient.invalidateQueries({ queryKey: ['audit', workspaceId] })
  }

  const updateMember = useMutation({
    mutationFn: (variables: { userId: string; role: WorkspaceRole }) =>
      provider.updateWorkspaceMember(workspaceId as string, variables.userId, variables.role),
    onSuccess: invalidate,
  })

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      provider.removeWorkspaceMember(workspaceId as string, userId),
    onSuccess: invalidate,
  })

  const createTeam = useMutation({
    mutationFn: (input: TeamAdminInput) => provider.createTeam(workspaceId as string, input),
    onSuccess: invalidate,
  })

  const updateTeam = useMutation({
    mutationFn: (variables: { teamId: string; input: TeamAdminInput }) =>
      provider.updateTeam(variables.teamId, variables.input),
    onSuccess: invalidate,
  })

  const deleteTeam = useMutation({
    mutationFn: (teamId: string) => provider.deleteTeam(teamId),
    onSuccess: invalidate,
  })

  const createCalendar = useMutation({
    mutationFn: (input: CalendarAdminInput) => provider.createCalendar(input),
    onSuccess: invalidate,
  })

  const transferOwnership = useMutation({
    mutationFn: (newOwnerId: string) =>
      provider.transferWorkspaceOwnership(workspaceId as string, newOwnerId),
    onSuccess: invalidate,
  })

  const deleteWorkspace = useMutation({
    mutationFn: (confirmationName: string) =>
      provider.deleteWorkspace(workspaceId as string, confirmationName),
    onSuccess: invalidate,
  })

  const auditQuery = useQuery({
    queryKey: ['audit', workspaceId],
    queryFn: () => provider.listAuditLog(workspaceId as string),
    enabled: Boolean(workspaceId),
  })

  return {
    updateMember,
    removeMember,
    createTeam,
    updateTeam,
    deleteTeam,
    createCalendar,
    transferOwnership,
    deleteWorkspace,
    auditQuery,
  }
}

export function useCalendarAdmin(workspaceId: string | null | undefined) {
  const provider = useDataProvider()
  const queryClient = useQueryClient()
  const { refresh } = useWorkspace()

  function invalidate() {
    refresh()
    void queryClient.invalidateQueries({ queryKey: ['calendars'] })
    void queryClient.invalidateQueries({ queryKey: ['events'] })
  }

  const updateCalendar = useMutation({
    mutationFn: (variables: {
      calendarId: string
      input: { name: string; description: string; color: string }
    }) => provider.updateCalendar(variables.calendarId, variables.input),
    onSuccess: invalidate,
  })

  const deleteCalendar = useMutation({
    mutationFn: (calendarId: string) => provider.deleteCalendar(calendarId),
    onSuccess: invalidate,
  })

  const upsertShare = useMutation({
    mutationFn: (input: CalendarShareInput) => provider.upsertCalendarShare(input),
    onSuccess: invalidate,
  })

  const deleteShare = useMutation({
    mutationFn: (shareId: string) => provider.deleteCalendarShare(shareId),
    onSuccess: invalidate,
  })

  return {
    workspaceId,
    updateCalendar,
    deleteCalendar,
    upsertShare,
    deleteShare,
  }
}
