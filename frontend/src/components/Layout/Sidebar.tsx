import React, { useState } from 'react'
import { NavLink, useParams, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, FolderOpen, Table2,
  BarChart3, LineChart, LogOut, Crown, ChevronDown,
  Building2, BookOpen, Monitor, Trophy, GraduationCap,
} from 'lucide-react'

function NavItem({
  to, icon: Icon, label, end, indent,
}: {
  to: string; icon: React.ElementType; label: string; end?: boolean; indent?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${
          indent ? 'ml-3' : ''
        } ${
          isActive
            ? 'bg-blue-50 text-blue-700 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-blue-600 before:rounded-r'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={16} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { projectId } = useParams()
  const [projectOpen, setProjectOpen] = useState(true)

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-200 flex flex-col select-none">

      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <BarChart3 size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-gray-900 font-bold text-xs leading-tight">Software de</p>
            <p className="text-blue-600 font-bold text-xs leading-tight">Equalização</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">

        {/* Principal */}
        <p className="px-3 pt-1 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Principal
        </p>
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" end />
        <NavItem to="/projetos" icon={FolderOpen} label="Projetos" />
        <NavItem to="/baseline" icon={Trophy} label="Baseline" />
        <NavItem to="/sicro" icon={BookOpen} label="Sicro" />
        <NavItem to="/ajuda" icon={GraduationCap} label="Guia & Ajuda" />

        {/* Projeto atual */}
        {projectId && (
          <>
            <div className="pt-3 pb-1">
              <button
                onClick={() => setProjectOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
              >
                Projeto atual
                <ChevronDown
                  size={12}
                  className={`transition-transform ${projectOpen ? 'rotate-0' : '-rotate-90'}`}
                />
              </button>
            </div>
            {projectOpen && (
              <div className="space-y-0.5">
                <NavItem
                  to={`/projetos/${projectId}/pq`}
                  icon={Table2}
                  label="Planilha PQ"
                  indent
                />
                <NavItem
                  to={`/projetos/${projectId}/equalizacao`}
                  icon={Building2}
                  label="Equalização"
                  indent
                />
                <NavItem
                  to={`/projetos/${projectId}/analises`}
                  icon={LineChart}
                  label="Análises"
                  indent
                />
              </div>
            )}
          </>
        )}

        {/* Administração */}
        {user?.is_admin && (
          <>
            <div className="pt-3 pb-1">
              <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Administração
              </p>
            </div>
            <NavItem to="/admin/usuarios" icon={Crown} label="Usuários" />
            <NavItem to="/admin/monitoramento" icon={Monitor} label="Monitoramento" />
          </>
        )}
      </nav>

      {/* Usuário */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.nome?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 text-xs font-semibold truncate leading-tight">{user?.nome}</p>
            <p className="text-gray-400 text-[10px] truncate leading-tight">{user?.empresa ?? user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-xs transition-colors"
        >
          <LogOut size={13} />
          Sair
        </button>
      </div>
    </aside>
  )
}
