import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '../components/ui/Layout'
import { AuthProvider, useAuth } from '../features/auth/AuthProvider'
import { JoinPage } from '../features/auth/JoinPage'
import { LoginPage } from '../features/auth/LoginPage'
import { ProfilePage } from '../features/auth/ProfilePage'
import { Placeholder } from '../features/home/Placeholder'
import { TeacherHome } from '../features/home/TeacherHome'
import { ReportPage } from '../features/reports/ReportPage'

const queryClient = new QueryClient()

// Teacher vs admin pages (admin screens are built in phase 6).
function RoleRoutes() {
  const { profile } = useAuth()
  if (profile?.role === 'admin') {
    return (
      <Routes>
        <Route index element={<Placeholder emoji="📊" title="דשבורד" />} />
        <Route path="reports" element={<Placeholder emoji="📝" title="דוחות" />} />
        <Route path="gaps" element={<Placeholder emoji="🧩" title="פערים" />} />
        <Route path="schedules" element={<Placeholder emoji="🗓️" title="מערכות" />} />
        <Route path="manage" element={<><Placeholder emoji="⚙️" title="ניהול" /><div className="mt-4"><ProfilePage /></div></>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }
  return (
    <Routes>
      <Route index element={<TeacherHome />} />
      <Route path="report" element={<ReportPage />} />
      <Route path="schedule" element={<Placeholder emoji="🗓️" title="מערכת שבועית" />} />
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
