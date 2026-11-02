function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

async function encryptionKey() {
  const raw = Deno.env.get('TOKEN_ENCRYPTION_KEY')
  if (!raw) throw new Error('TOKEN_ENCRYPTION_KEY is not configured')
  const bytes = base64ToBytes(raw)
  if (bytes.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key')
  }
  return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

export async function encryptToken(value: string) {
  const key = await encryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(value)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(cipher))}`
}

export async function decryptToken(payload: string) {
  const [ivPart, cipherPart] = payload.split('.')
  if (!ivPart || !cipherPart) throw new Error('Stored token is malformed')
  const key = await encryptionKey()
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(ivPart) },
    key,
    base64ToBytes(cipherPart),
  )
  return new TextDecoder().decode(plain)
}
