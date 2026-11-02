// @ts-ignore: npm specifiers are resolved by the Supabase Deno runtime.
import webpush from 'npm:web-push@3.6.7'

type StoredSubscription = {
  endpoint: string
  p256dh: string
  auth: string
}

export function configureWebPush() {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:notifications@microaxis.local'

  if (!publicKey || !privateKey) {
    throw new Error('Web Push is not configured: set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY')
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
}

export async function sendWebPush(
  subscription: StoredSubscription,
  payload: { title: string; body: string; url: string; tag: string },
) {
  configureWebPush()
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload),
  )
}
