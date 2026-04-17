import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../services/api'

const PAGE_LABELS: Record<string, string> = {
  '/':                      'Dashboard',
  '/projetos':              'Projetos',
  '/sicro':                 'SICRO',
  '/admin/usuarios':        'Admin — Usuários',
  '/admin/monitoramento':   'Admin — Monitoramento',
}

function getLabel(pathname: string): string {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname]
  if (pathname.endsWith('/pq'))         return 'Planilha PQ'
  if (pathname.endsWith('/equalizacao'))return 'Equalização'
  if (pathname.endsWith('/analises'))   return 'Análises'
  if (pathname.includes('/propostas/')) return 'Entrada de Proposta'
  return pathname
}

export function usePageTracking() {
  const location = useLocation()

  useEffect(() => {
    const label = getLabel(location.pathname)
    // fire-and-forget — never block navigation
    api.post('/activity', { pagina: label }).catch(() => {})
  }, [location.pathname])
}
