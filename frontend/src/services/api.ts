import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

/** Dispara download de um Blob como arquivo no browser */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    // Render free-tier cold start returns 502/503/504 via Vercel proxy
    const status = error.response?.status
    if (!error.response || status === 502 || status === 503 || status === 504) {
      error.isServerStarting = true
    }
    return Promise.reject(error)
  },
)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login-json', { email, password }),
  register: (data: { nome: string; email: string; empresa?: string; cargo?: string; password: string }) =>
    api.post('/auth/register', data),
  checkActivationToken: (token: string) =>
    api.get(`/auth/activate/check?token=${token}`),
  activate: (token: string, nome: string, password: string) =>
    api.post('/auth/activate', { token, nome, password }),
}

// ── Projects ─────────────────────────────────────────────────────────────────
export const projectsAPI = {
  list: () => api.get('/projects/'),
  create: (data: object) => api.post('/projects/', data),
  get: (id: number) => api.get(`/projects/${id}`),
  update: (id: number, data: object) => api.put(`/projects/${id}`, data),
  delete: (id: number) => api.delete(`/projects/${id}`),
}

// ── Revisions ────────────────────────────────────────────────────────────────
export const revisionsAPI = {
  list: (projectId: number) => api.get(`/projects/${projectId}/revisions`),
  create: (projectId: number, data: { numero: number; descricao?: string }) =>
    api.post(`/projects/${projectId}/revisions`, data),
  delete: (projectId: number, revisionId: number) =>
    api.delete(`/projects/${projectId}/revisions/${revisionId}`),
  compare: (projectId: number, revA: number, revB: number) =>
    api.get(`/projects/${projectId}/revisions/compare`, { params: { rev_a: revA, rev_b: revB } }),
  scopeValidation: (projectId: number, revisionId?: number) =>
    api.get(`/analytics/scope-validation/${projectId}`, revisionId ? { params: { revision_id: revisionId } } : {}),
}

// ── PQ Items ─────────────────────────────────────────────────────────────────
export const pqAPI = {
  list: (projectId: number, revisionId?: number) =>
    api.get(`/pq/project/${projectId}`, revisionId ? { params: { revision_id: revisionId } } : {}),
  bulkSave: (projectId: number, items: object[], revisionId?: number) =>
    api.put(`/pq/project/${projectId}/bulk`, { items, revision_id: revisionId ?? null }),
  downloadTemplate: (projectId: number) =>
    api.get(`/pq/project/${projectId}/template`, { responseType: 'blob' }),
  exportExcel: (projectId: number) =>
    api.get(`/pq/project/${projectId}/export`, { responseType: 'blob' }),
  importExcel: (projectId: number, file: File, revisionId?: number) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/pq/project/${projectId}/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: revisionId ? { revision_id: revisionId } : {},
    })
  },
}

// ── Proposals ────────────────────────────────────────────────────────────────
export const proposalsAPI = {
  list: (projectId: number) => api.get(`/proposals/project/${projectId}`),
  create: (projectId: number, data: object) =>
    api.post(`/proposals/project/${projectId}`, data),
  get: (id: number) => api.get(`/proposals/${id}`),
  getWithItems: (id: number) => api.get(`/proposals/${id}/items`),
  update: (id: number, data: object) => api.put(`/proposals/${id}`, data),
  updateItems: (id: number, items: object[]) =>
    api.put(`/proposals/${id}/items`, { items }),
  delete: (id: number) => api.delete(`/proposals/${id}`),
  unsetWinner: (id: number) => api.patch(`/proposals/${id}/unset-winner`),
  downloadTemplate: (proposalId: number) =>
    api.get(`/proposals/${proposalId}/template`, { responseType: 'blob' }),
  exportExcel: (proposalId: number) =>
    api.get(`/proposals/${proposalId}/export`, { responseType: 'blob' }),
  importExcel: (proposalId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/proposals/${proposalId}/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  getPareto: (projectId: number, source: 'referencia' | 'propostas' = 'referencia', revisionId?: number | null) =>
    api.get(`/analytics/pareto/${projectId}`, { params: { source, ...(revisionId ? { revision_id: revisionId } : {}) } }),
  getEqualization: (projectId: number, revisionId?: number | null) =>
    api.get(`/analytics/equalization/${projectId}`, revisionId ? { params: { revision_id: revisionId } } : {}),
  getDisciplines: (projectId: number, revisionId?: number | null) =>
    api.get(`/analytics/disciplines/${projectId}`, revisionId ? { params: { revision_id: revisionId } } : {}),
  getCategorias: (projectId: number, revisionId?: number | null) =>
    api.get(`/analytics/categorias/${projectId}`, revisionId ? { params: { revision_id: revisionId } } : {}),
  getLocalidades: (projectId: number, revisionId?: number | null) =>
    api.get(`/analytics/localidades/${projectId}`, revisionId ? { params: { revision_id: revisionId } } : {}),
  exportExcel: (projectId: number) =>
    api.get(`/analytics/export/${projectId}`, { responseType: 'blob' }),
  getBaseline: () => api.get('/analytics/baseline'),
  exportBaseline: () => api.get('/analytics/baseline/export', { responseType: 'blob' }),
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  listUsers: () => api.get('/admin/users'),
  updateUser: (id: number, data: {
    is_active?: boolean
    is_admin?: boolean
    assinatura_ate?: string | null
  }) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
}

// ── Monitoring ───────────────────────────────────────────────────────────────
export const monitoringAPI = {
  overview:   () => api.get('/admin/monitoring/overview'),
  db:         () => api.get('/admin/monitoring/db'),
  projects:   () => api.get('/admin/monitoring/projects'),
  activity:   (days = 30) => api.get('/admin/monitoring/activity', { params: { days } }),
}

export default api
