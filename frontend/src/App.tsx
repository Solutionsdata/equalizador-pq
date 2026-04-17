import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import PQEditor from './pages/PQEditor'
import ProposalInput from './pages/ProposalInput'
import Equalization from './pages/Equalization'
import Analytics from './pages/Analytics'
import AdminUsers from './pages/AdminUsers'
import AdminMonitoring from './pages/AdminMonitoring'
import Sicro from './pages/Sicro'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="flex items-center justify-center h-screen text-gray-500">Carregando…</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="flex items-center justify-center h-screen text-gray-500">Carregando…</div>
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_admin) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="projetos" element={<Projects />} />
        <Route path="projetos/:projectId/pq" element={<PQEditor />} />
        <Route path="projetos/:projectId/propostas/:proposalId" element={<ProposalInput />} />
        <Route path="projetos/:projectId/equalizacao" element={<Equalization />} />
        <Route path="projetos/:projectId/analises" element={<Analytics />} />
        <Route path="sicro" element={<Sicro />} />
        <Route
          path="admin/usuarios"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />
        <Route
          path="admin/monitoramento"
          element={
            <AdminRoute>
              <AdminMonitoring />
            </AdminRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
