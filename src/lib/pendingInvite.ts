const PENDING_INVITE_KEY = 'microaxis-pending-invite'

export function rememberPendingInvite(token: string) {
  try {
    window.localStorage.setItem(PENDING_INVITE_KEY, token)
  } catch {
    // Storage can be unavailable in private windows; sign-in still works.
  }
}

export function readPendingInvite(): string | null {
  try {
    return window.localStorage.getItem(PENDING_INVITE_KEY)
  } catch {
    return null
  }
}

export function clearPendingInvite() {
  try {
    window.localStorage.removeItem(PENDING_INVITE_KEY)
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
