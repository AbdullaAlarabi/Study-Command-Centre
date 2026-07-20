import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireRole } from './features/auth/RequireRole'
import { useAuth } from './features/auth/AuthProvider'
import { CoachShellPage } from './pages/CoachShellPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { StudentShellPage } from './pages/StudentShellPage'

function HomeRoute() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas px-6">
        <p className="text-sm font-medium text-navy/70">Loading your workspace…</p>
      </main>
    )
  }

  if (!user || !profile) return <Navigate to="/login" replace />
  return <Navigate to={`/${profile.role}`} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/student"
        element={
          <RequireRole role="student">
            <StudentShellPage />
          </RequireRole>
        }
      />
      <Route
        path="/coach"
        element={
          <RequireRole role="coach">
            <CoachShellPage />
          </RequireRole>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
