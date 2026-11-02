import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useAuth } from '../providers/AuthProvider'
import { supabase } from '../lib/supabase'

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unconfigured'

export function useRealtimeWorkspace(workspaceId: string | null | undefined) {
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

    function invalidateEvents() {
      void queryClient.invalidateQueries({ queryKey: ['events'] })
      void queryClient.invalidateQueries({ queryKey: ['calendars'] })
    }

    function invalidateNotifications() {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }

    const channel = client
      .channel(`workspace:${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `workspace_id=eq.${workspaceId}` },
        invalidateEvents,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_participants' },
        invalidateEvents,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_comments', filter: `workspace_id=eq.${workspaceId}` },
        invalidateEvents,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_attachments', filter: `workspace_id=eq.${workspaceId}` },
        invalidateEvents,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        invalidateNotifications,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendars', filter: `workspace_id=eq.${workspaceId}` },
        invalidateEvents,
      )
      .subscribe((nextStatus) => {
        if (nextStatus === 'SUBSCRIBED') {
          setStatus('connected')
          invalidateEvents()
          invalidateNotifications()
        } else if (nextStatus === 'CHANNEL_ERROR' || nextStatus === 'TIMED_OUT') {
          setStatus('error')
        }
      })

    return () => {
      void client.removeChannel(channel)
    }
  }, [queryClient, user, workspaceId])

  return status
}
