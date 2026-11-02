import { useCallback, useState } from 'react'
import { env } from '../lib/env'
import { supabase } from '../lib/supabase'
import { useAuth } from '../providers/AuthProvider'

export type PushSupport = 'available' | 'unsupported' | 'unconfigured'
export type PushResult = 'granted' | 'denied' | 'unsupported' | 'unconfigured'

export function getPushSupport(input: {
  vapidKey: string
  serviceWorker: boolean
  pushManager: boolean
  notification: boolean
}): PushSupport {
  if (!input.vapidKey) return 'unconfigured'
  if (!input.serviceWorker || !input.pushManager || !input.notification) return 'unsupported'
  return 'available'
}

function currentSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported'
  return getPushSupport({
    vapidKey: env.vapidPublicKey,
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notification: 'Notification' in window,
  })
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)))
}

export function usePushSubscription() {
  const { user } = useAuth()
  const [status, setStatus] = useState<PushResult | null>(null)
  const support = currentSupport()

  const subscribe = useCallback(async (): Promise<PushResult> => {
    if (!supabase || !user) {
      setStatus('unconfigured')
      return 'unconfigured'
    }

    if (support === 'unconfigured') {
      setStatus('unconfigured')
      return 'unconfigured'
    }

    if (support === 'unsupported') {
      setStatus('unsupported')
      return 'unsupported'
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setStatus('denied')
      return 'denied'
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(env.vapidPublicKey),
      })
      const json = subscription.toJSON()
      const keys = json.keys

      if (!keys?.p256dh || !keys?.auth) throw new Error('Push subscription did not include keys')

      const { error } = await supabase.rpc('save_push_subscription', {
        p_endpoint: subscription.endpoint,
        p_p256dh: keys.p256dh,
        p_auth: keys.auth,
        p_user_agent: navigator.userAgent,
      })

      if (error) throw error
      setStatus('granted')
      return 'granted'
    } catch {
      setStatus('denied')
      return 'denied'
    }
  }, [support, user])

  return { support, status, subscribe }
}
