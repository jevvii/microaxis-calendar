export type AppEnv = {
  supabaseUrl: string
  supabaseAnonKey: string
  demoMode: boolean
  vapidPublicKey: string
  googleClientId: string
}

type EnvSource = Record<string, string | boolean | undefined>

export function parseEnv(source: EnvSource): AppEnv {
  const supabaseUrl = String(source.VITE_SUPABASE_URL ?? '').trim()
  const supabaseAnonKey = String(source.VITE_SUPABASE_ANON_KEY ?? '').trim()
  const vapidPublicKey = String(source.VITE_VAPID_PUBLIC_KEY ?? '').trim()
  const googleClientId = String(source.VITE_GOOGLE_CLIENT_ID ?? '').trim()
  const forcedDemo = String(source.VITE_DEMO_MODE ?? '').toLowerCase() === 'true'

  return {
    supabaseUrl,
    supabaseAnonKey,
    demoMode: forcedDemo || !supabaseUrl || !supabaseAnonKey,
    vapidPublicKey,
    googleClientId,
  }
}

export const env = parseEnv(import.meta.env as unknown as EnvSource)
