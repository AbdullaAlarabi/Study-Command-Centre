import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './features/auth/RequireAuth'
import { RequireRole } from './features/auth/RequireRole'
import { useAuth } from './features/auth/AuthProvider'
import { LearningUnitGate } from './features/student/LearningUnitGate'
import { AppShell } from './layouts/AppShell'
import { RoleAwareAppShell } from './layouts/RoleAwareAppShell'
import { CoachShellPage } from './pages/CoachShellPage'
import { CoachActivityPage } from './pages/CoachActivityPage'
import { CoachAttemptDetailPage } from './pages/CoachAttemptDetailPage'
import { CoachAttemptsPage } from './pages/CoachAttemptsPage'
import { ChapterQuizPage } from './pages/ChapterQuizPage'
import { ChapterStudyPage } from './pages/ChapterStudyPage'
import { LoginPage } from './pages/LoginPage'
import { MockExamPage } from './pages/MockExamPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RevisionCentrePage } from './pages/RevisionCentrePage'
import { RevisionPage } from './pages/RevisionPage'
import { StudentRoadmapPage } from './pages/StudentRoadmapPage'
import { StudentResultsPage } from './pages/StudentResultsPage'
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
            <AppShell role="student" />
          </RequireRole>
        }
      >
        <Route index element={<StudentShellPage />} />
        <Route path="roadmap" element={<StudentRoadmapPage />} />
        <Route
          path="revision"
          element={<RevisionCentrePage />}
        />
        <Route path="results" element={<StudentResultsPage />} />
      </Route>
      <Route
        element={
          <RequireAuth>
            <RoleAwareAppShell />
          </RequireAuth>
        }
      >
        <Route
          path="/student/assessment/:assessmentId"
          element={<StudentRoadmapPage />}
        />
        <Route
          path="/student/chapter/:unitId"
          element={
            <LearningUnitGate>
              <ChapterStudyPage />
            </LearningUnitGate>
          }
        />
        <Route
          path="/student/quiz/:unitId"
          element={
            <LearningUnitGate>
              <ChapterQuizPage />
            </LearningUnitGate>
          }
        />
        <Route
          path="/student/revision/:unitId"
          element={
            <LearningUnitGate>
              <RevisionPage />
            </LearningUnitGate>
          }
        />
        <Route
          path="/student/mock/:unitId"
          element={
            <LearningUnitGate>
              <MockExamPage />
            </LearningUnitGate>
          }
        />
      </Route>
      <Route
        path="/coach"
        element={
          <RequireRole role="coach">
            <AppShell role="coach" />
          </RequireRole>
        }
      >
        <Route index element={<CoachShellPage />} />
        <Route path="attempts" element={<CoachAttemptsPage />} />
        <Route path="attempts/:attemptId" element={<CoachAttemptDetailPage />} />
        <Route path="essays" element={<CoachAttemptsPage essaysOnly />} />
        <Route path="activity" element={<CoachActivityPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
