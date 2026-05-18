import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { usePageTracking } from '../../hooks/usePageTracking'

export default function Layout() {
  usePageTracking()
  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  )
}
