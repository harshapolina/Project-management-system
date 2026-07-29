import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RequireAuth,
  GuestOnly,
  RoleGate,
  CapabilityGate,
} from './components/auth/RequireAuth'
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
} from './pages/auth/AuthPages'
import { OnboardingPage } from './pages/OnboardingPage'
import { HomePage } from './pages/HomePage'
import { PortfolioPage } from './pages/PortfolioPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectWorkspace } from './pages/project/ProjectWorkspace'
import { ProjectOverview } from './pages/project/ProjectOverview'
import { ProjectTasks } from './pages/project/ProjectTasks'
import { ProjectFiles } from './pages/project/ProjectFiles'
import { BoqPage } from './pages/BoqPage'
import {
  ProjectProcurement,
  ProjectSite,
  ProjectTeam,
} from './pages/project/ProjectModules'
import { LeadsPage } from './pages/LeadsPage'
import { ProcurementPage, FinancePage } from './pages/OpsPages'
import {
  ReportsPage,
  SettingsPage,
  MobileSupervisorPage,
} from './pages/MorePages'
import { PlatformAdminPage } from './pages/PlatformAdminPage'
import { InboxPage } from './pages/InboxPage'
import { AdminPeoplePage } from './pages/AdminPeoplePage'
import { SiteFeedPage } from './pages/SiteFeedPage'
import { ImpactPointsPage } from './pages/ImpactPointsPage'
import { CompanyAdminDashboard } from './pages/CompanyAdminDashboard'
import { PagePad } from './components/layout/PagePad'
import { ToastViewport } from './components/ui'
import { useAuthStore } from './lib/api'
import {
  homePathForUser,
  COMPANY_ADMIN_ROLES,
} from './lib/roles'

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

function HomeRedirect() {
  const user = useAuthStore((s) => s.user)
  return <Navigate to={homePathForUser(user) || '/projects'} replace />
}

function ProjectTabRedirect() {
  const { id } = useParams()
  return <Navigate to={`/projects/${id}/overview`} replace />
}

/** BOQ moved out of the project workspace into its own top-level module. */
function ProjectBoqRedirect() {
  const { id } = useParams()
  return <Navigate to={`/boq/${id}`} replace />
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
            <Route path="/home" element={<Navigate to="/portfolio" replace />} />
            <Route
              path="/my-tasks"
              element={<Navigate to="/?view=assigned" replace />}
            />
            <Route path="/inbox" element={<InboxPage />} />
            <Route
              path="/notifications"
              element={<Navigate to="/inbox" replace />}
            />
            <Route
              path="/site-feed"
              element={
                <CapabilityGate capability="siteFeed">
                  <PagePad>
                    <SiteFeedPage />
                  </PagePad>
                </CapabilityGate>
              }
            />
            <Route
              path="/company-admin"
              element={
                <RoleGate roles={COMPANY_ADMIN_ROLES}>
                  <PagePad>
                    <CompanyAdminDashboard />
                  </PagePad>
                </RoleGate>
              }
            />
            <Route
              path="/admin"
              element={
                <CapabilityGate capability="people">
                  <AdminPeoplePage />
                </CapabilityGate>
              }
            />
            <Route
              path="/portfolio"
              element={
                <CapabilityGate capability="portfolio">
                  <PagePad>
                    <PortfolioPage />
                  </PagePad>
                </CapabilityGate>
              }
            />
            <Route
              path="/leads"
              element={
                <CapabilityGate capability="leads">
                  <PagePad>
                    <LeadsPage />
                  </PagePad>
                </CapabilityGate>
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
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<ProjectOverview />} />
              <Route path="tasks" element={<ProjectTasks />} />
              <Route path="board" element={<Navigate to="../tasks" replace />} />
              <Route path="gantt" element={<Navigate to="../tasks" replace />} />
              <Route
                path="calendar"
                element={<Navigate to="../tasks" replace />}
              />
              <Route
                path="activity"
                element={<Navigate to="../overview" replace />}
              />
              <Route
                path="portal"
                element={<Navigate to="../team" replace />}
              />
              <Route
                path="site"
                element={
                  <CapabilityGate capability="siteFeed">
                    <ProjectSite />
                  </CapabilityGate>
                }
              />
              <Route
                path="team"
                element={
                  <CapabilityGate capability="manageProjects">
                    <ProjectTeam />
                  </CapabilityGate>
                }
              />
              <Route
                path="files"
                element={<ProjectFiles />}
              />
              <Route path="boq" element={<ProjectBoqRedirect />} />
              <Route
                path="procurement"
                element={
                  <CapabilityGate capability="procurement">
                    <ProjectProcurement />
                  </CapabilityGate>
                }
              />
              <Route path="*" element={<ProjectTabRedirect />} />
            </Route>
            <Route
              path="/boq"
              element={
                <CapabilityGate capability="boq">
                  <BoqPage />
                </CapabilityGate>
              }
            />
            <Route
              path="/boq/:projectId"
              element={
                <CapabilityGate capability="boq">
                  <BoqPage />
                </CapabilityGate>
              }
            />
            <Route
              path="/procurement"
              element={
                <CapabilityGate capability="procurement">
                  <PagePad>
                    <ProcurementPage />
                  </PagePad>
                </CapabilityGate>
              }
            />
            <Route
              path="/finance"
              element={
                <CapabilityGate capability="finance">
                  <PagePad>
                    <FinancePage />
                  </PagePad>
                </CapabilityGate>
              }
            />
            <Route
              path="/reports"
              element={
                <CapabilityGate capability="reports">
                  <PagePad>
                    <ReportsPage />
                  </PagePad>
                </CapabilityGate>
              }
            />
            <Route
              path="/impact"
              element={
                <CapabilityGate capability="impact">
                  <PagePad>
                    <ImpactPointsPage />
                  </PagePad>
                </CapabilityGate>
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
              path="/platform"
              element={
                <CapabilityGate capability="platform">
                  <PagePad>
                    <PlatformAdminPage />
                  </PagePad>
                </CapabilityGate>
              }
            />
            <Route
              path="/mobile"
              element={
                <CapabilityGate capability="mobile">
                  <PagePad>
                    <MobileSupervisorPage />
                  </PagePad>
                </CapabilityGate>
              }
            />

            {/* Old ClickUp-style routes → simple redirects */}
            <Route path="/planner" element={<Navigate to="/projects" replace />} />
            <Route path="/channels" element={<Navigate to="/inbox" replace />} />
            <Route
              path="/channels/:channelId"
              element={<Navigate to="/inbox" replace />}
            />
            <Route
              path="/assigned-comments"
              element={<Navigate to="/inbox" replace />}
            />
            <Route path="/quotations" element={<Navigate to="/boq" replace />} />
            <Route path="/ui-kit" element={<Navigate to="/projects" replace />} />
          </Route>

          <Route path="*" element={<HomeRedirect />} />
        </Routes>
        <ToastViewport />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
