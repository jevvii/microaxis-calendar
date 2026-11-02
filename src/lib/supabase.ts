import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

export const supabase: SupabaseClient | null = env.demoMode
  ? null
  : createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
