import {
  Activity,
  BarChart3,
  BookOpenText,
  ClipboardList,
  FileSearch,
  ListChecks,
  Map,
  MessageSquareText,
  NotebookTabs,
  Timer,
} from 'lucide-react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireRole } from './features/auth/RequireRole'
import { useAuth } from './features/auth/AuthProvider'
import { AppShell } from './layouts/AppShell'
import { CoachShellPage } from './pages/CoachShellPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PhasePlaceholderPage } from './pages/PhasePlaceholderPage'
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
        <Route
          path="roadmap"
          element={
            <PhasePlaceholderPage
              eyebrow="Assessment roadmap"
              title="Your route to each exam"
              description="Chapters, revision, and three mocks will unlock in a strict sequence."
              emptyTitle="Roadmap arrives in Phase 4"
              emptyDescription="The shell is ready, but live unit progress and lock states have not been added yet."
              icon={Map}
              homeTo="/student"
            />
          }
        />
        <Route
          path="assessment/:assessmentId"
          element={
            <PhasePlaceholderPage
              eyebrow="Assessment"
              title="Assessment overview"
              description="This route is ready for its seven-unit learning path."
              emptyTitle="Assessment details are not loaded yet"
              emptyDescription="Phase 4 will connect this view to the selected assessment and its sequential unlock state."
              icon={BookOpenText}
              homeTo="/student"
            />
          }
        />
        <Route
          path="chapter/:unitId"
          element={
            <PhasePlaceholderPage
              eyebrow="Chapter study pack"
              title="Focused chapter notes"
              description="Concise source-grounded notes will sit here before the chapter quiz gate."
              emptyTitle="Study-pack content is pending"
              emptyDescription="The chapter experience is implemented in Phase 5 and populated only from university files."
              icon={BookOpenText}
              homeTo="/student"
            />
          }
        />
        <Route
          path="quiz/:unitId"
          element={
            <PhasePlaceholderPage
              eyebrow="Chapter quiz"
              title="Prove the chapter"
              description="Five objective questions and one essay will control chapter completion."
              emptyTitle="Quiz engine arrives in Phase 5"
              emptyDescription="No sample score or question is shown until the verified quiz bank and attempt flow are connected."
              icon={ListChecks}
              homeTo="/student"
            />
          }
        />
        <Route
          path="revision"
          element={
            <PhasePlaceholderPage
              eyebrow="Revision centre"
              title="Bring the chapters together"
              description="Summaries, comparisons, essay plans, and weak-topic practice will live here."
              emptyTitle="Revision content arrives in Phase 6"
              emptyDescription="This navigation destination is ready without using fake practice data."
              icon={NotebookTabs}
              homeTo="/student"
            />
          }
        />
        <Route
          path="revision/:unitId"
          element={
            <PhasePlaceholderPage
              eyebrow="Full revision"
              title="Assessment revision pack"
              description="This route will load the selected assessment's verified revision material."
              emptyTitle="Revision pack not populated yet"
              emptyDescription="It will unlock only after all three chapter quizzes pass."
              icon={NotebookTabs}
              homeTo="/student"
            />
          }
        />
        <Route
          path="mock/:unitId"
          element={
            <PhasePlaceholderPage
              eyebrow="Mock exam"
              title="Exam rehearsal"
              description="Diagnostic, timed, and final-rehearsal modes will use the configured assessment format."
              emptyTitle="Mock engine arrives in Phase 7"
              emptyDescription="Timer, answer backup, grading, and sequential unlock behavior are not simulated in this shell phase."
              icon={Timer}
              homeTo="/student"
            />
          }
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
