import {
  Activity,
  BarChart3,
  ClipboardList,
  FileSearch,
  MessageSquareText,
  Timer,
} from 'lucide-react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './features/auth/RequireAuth'
import { RequireRole } from './features/auth/RequireRole'
import { useAuth } from './features/auth/AuthProvider'
import { LearningUnitGate } from './features/student/LearningUnitGate'
import { AppShell } from './layouts/AppShell'
import { RoleAwareAppShell } from './layouts/RoleAwareAppShell'
import { CoachShellPage } from './pages/CoachShellPage'
import { ChapterQuizPage } from './pages/ChapterQuizPage'
import { ChapterStudyPage } from './pages/ChapterStudyPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PhasePlaceholderPage } from './pages/PhasePlaceholderPage'
import { RevisionCentrePage } from './pages/RevisionCentrePage'
import { RevisionPage } from './pages/RevisionPage'
import { StudentRoadmapPage } from './pages/StudentRoadmapPage'
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
        <Route
          path="results"
          element={
            <PhasePlaceholderPage
              eyebrow="Results"
              title="Your evidence of progress"
              description="Quiz attempts, mock results, and weak topics will appear after real submissions."
              emptyTitle="No results yet"
              emptyDescription="This is an honest empty state. No placeholder scores have been created."
              icon={BarChart3}
              homeTo="/student"
            />
          }
        />
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
              <PhasePlaceholderPage
                eyebrow="Mock exam"
                title="Exam rehearsal"
                description="Diagnostic, timed, and final-rehearsal modes will use the configured assessment format."
                emptyTitle="Mock engine arrives in Phase 7"
                emptyDescription="Timer, answer backup, grading, and sequential unlock behavior are not simulated in this shell phase."
                icon={Timer}
                homeTo="/student"
              />
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
        <Route
          path="attempts"
          element={
            <PhasePlaceholderPage
              eyebrow="Quiz and mock attempts"
              title="Attempt history"
              description="Review every submitted answer without asking the student for screenshots."
              emptyTitle="No attempts yet"
              emptyDescription="Attempt monitoring is implemented with the coach analytics in Phase 8."
              icon={ClipboardList}
              homeTo="/coach"
            />
          }
        />
        <Route
          path="attempts/:attemptId"
          element={
            <PhasePlaceholderPage
              eyebrow="Attempt details"
              title="Submitted answers"
              description="Objective responses, essays, feedback, and weak topics will be visible here."
              emptyTitle="Attempt details are not available yet"
              emptyDescription="This route is reserved for real submitted attempts in Phase 8."
              icon={FileSearch}
              homeTo="/coach"
            />
          }
        />
        <Route
          path="essays"
          element={
            <PhasePlaceholderPage
              eyebrow="Essay review"
              title="Essays awaiting review"
              description="Add concise feedback and an optional score without blocking student progress."
              emptyTitle="No essays awaiting review"
              emptyDescription="Essay review controls are added with the coach dashboard in Phase 8."
              icon={MessageSquareText}
              homeTo="/coach"
            />
          }
        />
        <Route
          path="activity"
          element={
            <PhasePlaceholderPage
              eyebrow="Activity"
              title="Recent student activity"
              description="Starts, submissions, reviews, resets, and completions will form a clear timeline."
              emptyTitle="No activity to show"
              emptyDescription="The live activity query and monitoring view arrive in Phase 8."
              icon={Activity}
              homeTo="/coach"
            />
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
