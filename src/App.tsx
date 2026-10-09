import { Navigate, Route, Routes } from 'react-router-dom'
import { Spin } from '@arco-design/web-react'
import { useAuth } from './auth'
import AppLayout from './layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Nodes from './pages/Nodes'
import Users from './pages/Users'
import Domains from './pages/Domains'
import Bbr from './pages/Bbr'
import Toolbox from './pages/Toolbox'
import Terminal from './pages/Terminal'
import PanelSettings from './pages/PanelSettings'

function Protected({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth()
  if (!ready) {
    return (
      <div className="center-screen">
        <Spin size={40} />
      </div>
    )
  }
  if (!session) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default function App() {
  const { session, ready } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={ready && session ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="nodes" element={<Nodes />} />
        <Route path="users" element={<Users />} />
        <Route path="domains" element={<Domains />} />
        <Route path="bbr" element={<Bbr />} />
        <Route path="toolbox" element={<Toolbox />} />
        <Route path="terminal" element={<Terminal />} />
        <Route path="panel" element={<PanelSettings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
