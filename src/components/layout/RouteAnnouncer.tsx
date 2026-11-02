import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

function pageTitle(pathname: string) {
  if (pathname.includes('/notifications')) return 'Notifications'
  if (pathname.includes('/settings')) return 'Settings'
  if (pathname.includes('/workspace')) return 'Workspace'
  if (pathname.includes('/team/')) return 'Team'
  if (pathname.includes('/calendar')) return 'Calendar'
  if (pathname.includes('/onboarding')) return 'Create workspace'
  if (pathname.includes('/invite/')) return 'Invitation'
  if (pathname === '/auth') return 'Sign in'
  if (pathname === '/offline') return 'Offline'
  return 'MicroAxis Calendar'
}

export function RouteAnnouncer() {
  const location = useLocation()
  const [announcement, setAnnouncement] = useState('')
  const firstRender = useRef(true)

  useEffect(() => {
    const title = pageTitle(location.pathname)
    document.title = `${title} · MicroAxis`

    if (firstRender.current) {
      firstRender.current = false
      return
    }

    setAnnouncement(`${title} page loaded`)
    requestAnimationFrame(() => {
      const main = document.querySelector('main')
      if (!main) return
      main.setAttribute('tabindex', '-1')
      main.focus()
    })
  }, [location.pathname])

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  )
}
