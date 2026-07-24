import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RequireAuth, GuestOnly } from './components/auth/RequireAuth'
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
} from './pages/auth/AuthPages'
import { OnboardingPage } from './pages/OnboardingPage'
import { HomePage } from './pages/HomePage'
import { UiKitPage } from './pages/UiKitPage'
import { PortfolioPage } from './pages/PortfolioPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectWorkspace } from './pages/project/ProjectWorkspace'
import { ProjectOverview } from './pages/project/ProjectOverview'
import { ProjectTasks } from './pages/project/ProjectTasks'
import { ProjectFiles } from './pages/project/ProjectFiles'
import { ProjectBoq } from './pages/project/ProjectBoq'
import {
  ProjectProcurement,
  ProjectSite,
  ProjectTeam,
  ProjectActivity,
  ProjectClientPortal,
} from './pages/project/ProjectModules'
import { LeadsPage } from './pages/LeadsPage'
import {
  QuotationsPage,
  ProcurementPage,
  FinancePage,
} from './pages/OpsPages'
import {
  ReportsPage,
  SettingsPage,
  MobileSupervisorPage,
} from './pages/MorePages'
import { InboxPage } from './pages/InboxPage'
import { AssignedCommentsPage } from './pages/AssignedCommentsPage'
import { PlannerPage } from './pages/PlannerPage'
import { ChannelsPage } from './pages/ChannelsPage'
import { PagePad } from './components/layout/PagePad'
import { ToastViewport } from './components/ui'
import { useAuthStore } from './lib/api'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function OnboardingRoute() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  if (!user || !accessToken) return <Navigate to="/login" replace />
  return <OnboardingPage />
}

function W({ children }) {
  return <div className="p-4">{children}</div>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          <Route path="/onboarding" element={<OnboardingRoute />} />

          <Route element={<RequireAuth />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/planner" element={<PlannerPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/channels" element={<ChannelsPage />} />
            <Route path="/channels/:channelId" element={<ChannelsPage />} />
            <Route
              path="/assigned-comments"
              element={<AssignedCommentsPage />}
            />
            <Route
              path="/notifications"
              element={<Navigate to="/inbox?tab=primary" replace />}
            />
            <Route
              path="/portfolio"
              element={
                <PagePad>
                  <PortfolioPage />
                </PagePad>
              }
            />
            <Route
              path="/leads"
              element={
                <PagePad>
                  <LeadsPage />
                </PagePad>
              }
            />
            <Route
              path="/projects"
              element={
                <PagePad>
                  <ProjectsPage />
                </PagePad>
              }
            />
            <Route path="/projects/:id" element={<ProjectWorkspace />}>
              <Route index element={<Navigate to="tasks" replace />} />
              <Route
                path="overview"
                element={
                  <W>
                    <ProjectOverview />
                  </W>
                }
              />
              <Route path="tasks" element={<ProjectTasks forcedView="list" />} />
              <Route path="board" element={<ProjectTasks forcedView="board" />} />
              <Route path="gantt" element={<ProjectTasks forcedView="gantt" />} />
              <Route
                path="calendar"
                element={<ProjectTasks forcedView="calendar" />}
              />
              <Route
                path="files"
                element={
                  <W>
                    <ProjectFiles />
                  </W>
                }
              />
              <Route
                path="boq"
                element={
                  <W>
                    <ProjectBoq />
                  </W>
                }
              />
              <Route
                path="procurement"
                element={
                  <W>
                    <ProjectProcurement />
                  </W>
                }
              />
              <Route
                path="site"
                element={
                  <W>
                    <ProjectSite />
                  </W>
                }
              />
              <Route
                path="team"
                element={
                  <W>
                    <ProjectTeam />
                  </W>
                }
              />
              <Route
                path="portal"
                element={
                  <W>
                    <ProjectClientPortal />
                  </W>
                }
              />
              <Route
                path="activity"
                element={
                  <W>
                    <ProjectActivity />
                  </W>
                }
              />
            </Route>
            <Route
              path="/quotations"
              element={
                <PagePad>
                  <QuotationsPage />
                </PagePad>
              }
            />
            <Route
              path="/procurement"
              element={
                <PagePad>
                  <ProcurementPage />
                </PagePad>
              }
            />
            <Route
              path="/finance"
              element={
                <PagePad>
                  <FinancePage />
                </PagePad>
              }
            />
            <Route
              path="/reports"
              element={
                <PagePad>
                  <ReportsPage />
                </PagePad>
              }
            />
            <Route
              path="/settings"
              element={
                <PagePad>
                  <SettingsPage />
                </PagePad>
              }
            />
            <Route
              path="/mobile"
              element={
                <PagePad>
                  <MobileSupervisorPage />
                </PagePad>
              }
            />
            <Route
              path="/ui-kit"
              element={
                <PagePad>
                  <UiKitPage />
                </PagePad>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastViewport />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
