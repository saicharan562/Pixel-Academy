import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PERMISSIONS } from '@pixel/shared';
import { AppShell } from './components/AppShell.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { ThemeBackground } from './theme/ThemeBackground.js';
import { LoginPage } from './pages/LoginPage.js';
import { PlaceholderPage } from './pages/PlaceholderPage.js';

// Route-level code-splitting: each screen is its own chunk so the initial bundle
// stays lean and the heavy three.js/landing code never loads inside the app.
const LandingPage = lazy(() => import('./pages/LandingPage.js').then((m) => ({ default: m.LandingPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage.js').then((m) => ({ default: m.DashboardPage })));
const ClientsPage = lazy(() => import('./pages/ClientsPage.js').then((m) => ({ default: m.ClientsPage })));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage.js').then((m) => ({ default: m.ProjectsPage })));
const TasksPage = lazy(() => import('./pages/TasksPage.js').then((m) => ({ default: m.TasksPage })));
const TimesheetsPage = lazy(() => import('./pages/TimesheetsPage.js').then((m) => ({ default: m.TimesheetsPage })));
const AttendancePage = lazy(() => import('./pages/AttendancePage.js').then((m) => ({ default: m.AttendancePage })));
const LeavesPage = lazy(() => import('./pages/LeavesPage.js').then((m) => ({ default: m.LeavesPage })));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage.js').then((m) => ({ default: m.InvoicesPage })));
const UsersPage = lazy(() => import('./pages/UsersPage.js').then((m) => ({ default: m.UsersPage })));
const TicketsPage = lazy(() => import('./pages/TicketsPage.js').then((m) => ({ default: m.TicketsPage })));
const DealsPage = lazy(() => import('./pages/DealsPage.js').then((m) => ({ default: m.DealsPage })));
const StylePage = lazy(() => import('./pages/StylePage.js').then((m) => ({ default: m.StylePage })));

export function App() {
  return (
    <>
      <ThemeBackground />
      <Routes>
        <Route
          path="/welcome"
          element={
            <Suspense fallback={<div className="min-h-screen bg-bg" />}>
              <LandingPage />
            </Suspense>
          }
        />
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="clients" element={<ProtectedRoute permission={PERMISSIONS.CLIENT_VIEW}><ClientsPage /></ProtectedRoute>} />
          <Route path="deals" element={<ProtectedRoute permission={PERMISSIONS.DEAL_VIEW}><DealsPage /></ProtectedRoute>} />
          <Route path="projects" element={<ProtectedRoute permission={PERMISSIONS.PROJECT_VIEW}><ProjectsPage /></ProtectedRoute>} />
          <Route path="tasks" element={<ProtectedRoute permission={PERMISSIONS.TASK_VIEW}><TasksPage /></ProtectedRoute>} />
          <Route path="timesheets" element={<ProtectedRoute permission={PERMISSIONS.TIMESHEET_VIEW}><TimesheetsPage /></ProtectedRoute>} />
          <Route path="attendance" element={<ProtectedRoute permission={PERMISSIONS.ATTENDANCE_VIEW}><AttendancePage /></ProtectedRoute>} />
          <Route path="leaves" element={<ProtectedRoute permission={PERMISSIONS.LEAVE_VIEW}><LeavesPage /></ProtectedRoute>} />
          <Route path="invoices" element={<ProtectedRoute permission={PERMISSIONS.INVOICE_VIEW}><InvoicesPage /></ProtectedRoute>} />
          <Route path="tickets" element={<ProtectedRoute permission={PERMISSIONS.TICKET_VIEW}><TicketsPage /></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute permission={PERMISSIONS.USER_VIEW}><UsersPage /></ProtectedRoute>} />
          <Route path="style" element={<StylePage />} />
        </Route>

        <Route path="*" element={<PlaceholderPage title="Not found" />} />
      </Routes>
    </>
  );
}
