import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '../components/ui/Layout'
import { Placeholder } from '../features/home/Placeholder'

const queryClient = new QueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Placeholder emoji="🏡" title="בית" />} />
            <Route path="report" element={<Placeholder emoji="📝" title="דוח שבועי" />} />
            <Route path="schedule" element={<Placeholder emoji="🗓️" title="מערכת שבועית" />} />
            <Route path="profile" element={<Placeholder emoji="🌸" title="פרופיל" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  )
}
