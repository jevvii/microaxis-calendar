import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useAuth } from '../providers/AuthProvider'
import { supabase } from '../lib/supabase'

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unconfigured'

export function useRealtimeWorkspace(
  workspaceId: string | null | undefined,
  onStructureChange?: () => void,
) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<RealtimeStatus>('idle')

  useEffect(() => {
    if (!workspaceId || !user) {
      setStatus('idle')
      return
    }

    if (!supabase) {
      setStatus('unconfigured')
      return
    }

    setStatus('connecting')
    const client = supabase

    function invalidateEventData() {
      for (const queryKey of ['events', 'calendars', 'comments', 'attachments', 'activity']) {
        void queryClient.invalidateQueries({ queryKey: [queryKey] })
      }
    }

    function invalidateStructure() {
      onStructureChange?.()
      void queryClient.invalidateQueries({ queryKey: ['calendars'] })
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      void queryClient.invalidateQueries({ queryKey: ['audit', workspaceId] })
    }

    function invalidateNotifications() {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }

    function invalidateCategories() {
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
    }

    const channel = client
      .channel(`workspace:${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `workspace_id=eq.${workspaceId}` },
        invalidateEventData,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_participants' },
        invalidateEventData,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_comments', filter: `workspace_id=eq.${workspaceId}` },
        invalidateEventData,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_attachments', filter: `workspace_id=eq.${workspaceId}` },
        invalidateEventData,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        invalidateNotifications,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendars', filter: `workspace_id=eq.${workspaceId}` },
        invalidateEventData,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `workspace_id=eq.${workspaceId}` },
        invalidateStructure,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members' },
        invalidateStructure,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workspace_members', filter: `workspace_id=eq.${workspaceId}` },
        invalidateStructure,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_shares' },
        invalidateStructure,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_categories', filter: `workspace_id=eq.${workspaceId}` },
        invalidateCategories,
      )
      .subscribe((nextStatus) => {
        if (nextStatus === 'SUBSCRIBED') {
          setStatus('connected')
          // A reconnect can miss changes, so refresh every workspace-scoped query.
          invalidateEventData()
          invalidateNotifications()
          invalidateCategories()
          onStructureChange?.()
          void queryClient.invalidateQueries({ queryKey: ['audit', workspaceId] })
        } else if (nextStatus === 'CHANNEL_ERROR' || nextStatus === 'TIMED_OUT') {
          setStatus('error')
        }
      })

    return () => {
      void client.removeChannel(channel)
    }
  }, [onStructureChange, queryClient, user, workspaceId])

  return status
}
