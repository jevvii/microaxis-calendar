import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { env } from '../lib/env'
import { supabase } from '../lib/supabase'

type GoogleConnection = {
  google_email: string | null
  google_calendar_id: string | null
  sync_enabled: boolean
  token_expires_at: string | null
}

export function getGoogleSupport(clientId: string, hasSupabase: boolean) {
  if (!clientId || !hasSupabase) return 'unconfigured' as const
  return 'available' as const
}

export function useGoogleConnection() {
  const queryClient = useQueryClient()
  const support = getGoogleSupport(env.googleClientId, Boolean(supabase))

  const connectionQuery = useQuery({
    queryKey: ['google-connection'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('google_connections')
        .select('google_email, google_calendar_id, sync_enabled, token_expires_at')
        .maybeSingle<GoogleConnection>()
      if (error) throw error
      return data
    },
    enabled: support === 'available',
  })

  const preferencesQuery = useQuery({
    queryKey: ['google-export-preferences'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('calendar_export_preferences')
        .select('calendar_id, enabled')
        .eq('enabled', true)
      if (error) throw error
      return new Map(
        (data ?? []).map((row: { calendar_id: string; enabled: boolean }) => [
          row.calendar_id,
          row.enabled,
        ]),
      )
    },
    enabled: support === 'available',
  })

  const connect = useMutation({
    mutationFn: async () => {
      if (!supabase || support !== 'available') {
        throw new Error('Google Calendar is not configured')
      }
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { action: 'start' },
      })
      if (error) throw error
      if (!data?.url) throw new Error('Google did not return a consent URL')
      window.location.assign(data.url as string)
      return data.url as string
    },
  })

  const exchange = useMutation({
    mutationFn: async (variables: { code: string; state: string }) => {
      if (!supabase || support !== 'available') {
        throw new Error('Google Calendar is not configured')
      }
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { action: 'exchange', code: variables.code, state: variables.state },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error as string)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['google-connection'] })
    },
  })

  const disconnect = useMutation({
    mutationFn: async () => {
      if (!supabase || support !== 'available') {
        throw new Error('Google Calendar is not configured')
      }
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { action: 'disconnect' },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error as string)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['google-connection'] })
    },
  })

  const sync = useMutation({
    mutationFn: async () => {
      if (!supabase || support !== 'available') {
        throw new Error('Google Calendar is not configured')
      }
      const { data, error } = await supabase.functions.invoke('google-sync', {
        body: {},
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['google-connection'] })
    },
  })

  const setCalendarExport = useMutation({
    mutationFn: async (variables: { calendarId: string; enabled: boolean }) => {
      if (!supabase) throw new Error('Supabase is not configured')
      if (!variables.enabled) {
        const { error } = await supabase
          .from('calendar_export_preferences')
          .delete()
          .eq('calendar_id', variables.calendarId)
        if (error) throw error
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) throw new Error('You need to be signed in')
      const { error } = await supabase.from('calendar_export_preferences').upsert({
        user_id: userData.user.id,
        calendar_id: variables.calendarId,
        enabled: true,
      })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['google-export-preferences'] })
    },
  })

  return {
    support,
    connection: connectionQuery.data ?? null,
    loading: connectionQuery.isLoading,
    error: connectionQuery.error,
    preferences: preferencesQuery.data ?? new Map<string, boolean>(),
    connect,
    exchange,
    disconnect,
    sync,
    setCalendarExport,
  }
}
