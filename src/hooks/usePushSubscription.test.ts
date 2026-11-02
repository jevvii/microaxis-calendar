import { describe, expect, it } from 'vitest'
import { getPushSupport } from './usePushSubscription'

describe('getPushSupport', () => {
  it('returns unconfigured when the VAPID key is missing', () => {
    expect(
      getPushSupport({
        vapidKey: '',
        serviceWorker: true,
        pushManager: true,
        notification: true,
      }),
    ).toBe('unconfigured')
  })

  it('returns unsupported when the browser lacks push APIs', () => {
    expect(
      getPushSupport({
        vapidKey: 'vapid-key',
        serviceWorker: false,
        pushManager: true,
        notification: true,
      }),
    ).toBe('unsupported')
  })

  it('returns available when the key and APIs are present', () => {
    expect(
      getPushSupport({
        vapidKey: 'vapid-key',
        serviceWorker: true,
        pushManager: true,
        notification: true,
      }),
    ).toBe('available')
  })
})
