import { CircleNotch } from '@phosphor-icons/react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { Logo } from './components/layout/Logo'
import { DataProviderProvider } from './data/provider'
import { AuthPage } from './pages/AuthPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { CalendarPage } from './pages/CalendarPage'
import { GoogleCallbackPage } from './pages/GoogleCallbackPage'
import { InvitePage } from './pages/InvitePage'
import { NotificationsPage } from './pages/NotificationsPage'
import { OfflinePage } from './pages/OfflinePage'
import { OnboardingPage } from './pages/OnboardingPage'
import { SettingsPage } from './pages/SettingsPage'
import { TeamPage } from './pages/TeamPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { AuthProvider, useAuth } from './providers/AuthProvider'
import { QueryProvider } from './providers/QueryProvider'
import { ThemeProvider } from './providers/ThemeProvider'
import { ToastProvider } from './providers/ToastProvider'
import { WorkspaceProvider } from './providers/WorkspaceProvider'

function LoadingScreen() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-canvas px-6">
      <div className="text-center">
        <Logo linked={false} className="justify-center" />
        <CircleNotch size={20} className="mx-auto mt-8 animate-spin text-ink-3" aria-hidden />
        <p className="mt-3 text-sm text-ink-3">Opening the calendar.</p>
      </div>
    </main>
  )
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return <Navigate to={user ? '/app/calendar' : '/auth'} replace />
}

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" replace />
  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <QueryProvider>
            <DataProviderProvider>
              <AuthProvider>
                <WorkspaceProvider>
                <Routes>
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/invite/:token" element={<InvitePage />} />
                  <Route path="/offline" element={<OfflinePage />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/app" element={<AppLayout />}>
                      <Route index element={<Navigate to="calendar" replace />} />
                      <Route path="calendar" element={<CalendarPage />} />
                      <Route path="notifications" element={<NotificationsPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                      <Route path="google/callback" element={<GoogleCallbackPage />} />
                      <Route path="workspace" element={<WorkspacePage />} />
                      <Route path="team/:teamId" element={<TeamPage />} />
                    </Route>
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </WorkspaceProvider>
              </AuthProvider>
            </DataProviderProvider>
          </QueryProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
