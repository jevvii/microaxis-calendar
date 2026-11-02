import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

describe('parseEnv', () => {
  it('enables demo mode when no Supabase URL is configured', () => {
    const parsed = parseEnv({
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
      VITE_DEMO_MODE: 'false',
      VITE_VAPID_PUBLIC_KEY: '',
    })

    expect(parsed.demoMode).toBe(true)
    expect(parsed.supabaseUrl).toBe('')
  })

  it('disables demo mode when Supabase is configured', () => {
    const parsed = parseEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
      VITE_DEMO_MODE: 'false',
      VITE_VAPID_PUBLIC_KEY: 'vapid-key',
    })

    expect(parsed.demoMode).toBe(false)
    expect(parsed.supabaseAnonKey).toBe('anon-key')
    expect(parsed.vapidPublicKey).toBe('vapid-key')
  })

  it('allows demo mode to be forced even when Supabase is configured', () => {
    const parsed = parseEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
      VITE_DEMO_MODE: 'true',
      VITE_VAPID_PUBLIC_KEY: '',
    })

    expect(parsed.demoMode).toBe(true)
  })
})
