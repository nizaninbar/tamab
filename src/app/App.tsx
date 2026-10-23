import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '../components/ui/Layout'
import { AuthProvider, useAuth } from '../features/auth/AuthProvider'
import { JoinPage } from '../features/auth/JoinPage'
import { LoginPage } from '../features/auth/LoginPage'
import { ProfilePage } from '../features/auth/ProfilePage'
import { AdminDashboard } from '../features/admin/AdminDashboard'
import { AdminGaps } from '../features/admin/AdminGaps'
import { AdminManage } from '../features/admin/AdminManage'
import { AdminReports } from '../features/admin/AdminReports'
import { AdminSchedules } from '../features/admin/AdminSchedules'
import { TeacherHome } from '../features/home/TeacherHome'
import { ReportPage } from '../features/reports/ReportPage'
import { SchedulePage } from '../features/schedule/SchedulePage'

const queryClient = new QueryClient()

// Teacher vs admin pages.
function RoleRoutes() {
  const { profile } = useAuth()
  if (profile?.role === 'admin') {
    return (
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="gaps" element={<AdminGaps />} />
        <Route path="schedules" element={<AdminSchedules />} />
        <Route path="manage" element={<AdminManage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }
  return (
    <Routes>
      <Route index element={<TeacherHome />} />
      <Route path="report" element={<ReportPage />} />
      <Route path="schedule" element={<SchedulePage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="login" element={<LoginPage />} />
            <Route path="join" element={<JoinPage />} />
            <Route element={<Layout />}>
              <Route path="*" element={<RoleRoutes />} />
            </Route>
          </Routes>
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
