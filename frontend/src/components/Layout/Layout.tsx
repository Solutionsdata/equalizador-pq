import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { usePageTracking } from '../../hooks/usePageTracking'

export default function Layout() {
  usePageTracking()
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
