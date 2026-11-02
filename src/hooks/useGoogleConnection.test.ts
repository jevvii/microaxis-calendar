import { describe, expect, it } from 'vitest'
import { getGoogleSupport } from './useGoogleConnection'

describe('getGoogleSupport', () => {
  it('is unconfigured without a public client id', () => {
    expect(getGoogleSupport('', true)).toBe('unconfigured')
  })

  it('is unconfigured without Supabase', () => {
    expect(getGoogleSupport('client-id', false)).toBe('unconfigured')
  })

  it('is available when both the client id and Supabase are present', () => {
    expect(getGoogleSupport('client-id', true)).toBe('available')
  })
})
