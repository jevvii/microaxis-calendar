import { describe, expect, it } from 'vitest'
import {
  acceptInvite,
  createWorkspaceInvite,
  isAuthConfigured,
  signInWithGoogle,
  signInWithMagicLink,
} from './auth'

describe('auth helpers', () => {
  it('reports that Supabase auth is not configured in demo mode', () => {
    expect(isAuthConfigured()).toBe(false)
  })

  it('rejects a malformed email before calling Supabase', async () => {
    const result = await signInWithMagicLink('not-an-email')
    expect(result.error).toBe('Enter a valid email address')
  })

  it('returns a clear configuration error for Google sign-in', async () => {
    const result = await signInWithGoogle()
    expect(result.error).toMatch(/Supabase is not configured/i)
  })

  it('returns a clear configuration error for magic links', async () => {
    const result = await signInWithMagicLink('mara@microaxis.test')
    expect(result.error).toMatch(/Supabase is not configured/i)
  })

  it('returns a clear configuration error when accepting an invite', async () => {
    const result = await acceptInvite('token')
    expect(result.error).toMatch(/Supabase is not configured/i)
  })

  it('returns a clear configuration error when creating an invite', async () => {
    const result = await createWorkspaceInvite({
      workspaceId: '10000000-0000-4000-8000-000000000001',
      email: 'new.member@microaxis.test',
      role: 'member',
    })
    expect(result.error).toMatch(/Supabase is not configured/i)
  })
})
