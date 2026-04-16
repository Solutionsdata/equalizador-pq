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
    return Promise.reject(error)
  },
)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login-json', { email, password }),
  register: (data: { nome: string; email: string; empresa?: string; cargo?: string; password: string }) =>
    api.post('/auth/register', data),
}

// ── Projects ─────────────────────────────────────────────────────────────────
export const projectsAPI = {
  list: () => api.get('/projects/'),
  create: (data: object) => api.post('/projects/', data),
  get: (id: number) => api.get(`/projects/${id}`),
  update: (id: number, data: object) => api.put(`/projects/${id}`, data),
  delete: (id: number) => api.delete(`/projects/${id}`),
}

// ── PQ Items ─────────────────────────────────────────────────────────────────
export const pqAPI = {
  list: (projectId: number) => api.get(`/pq/project/${projectId}`),
  bulkSave: (projectId: number, items: object[]) =>
    api.put(`/pq/project/${projectId}/bulk`, { items }),
  downloadTemplate: (projectId: number) =>
    api.get(`/pq/project/${projectId}/template`, { responseType: 'blob' }),
  exportExcel: (projectId: number) =>
    api.get(`/pq/project/${projectId}/export`, { responseType: 'blob' }),
  importExcel: (projectId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/pq/project/${projectId}/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
  getPareto: (projectId: number, source: 'referencia' | 'propostas' = 'referencia') =>
    api.get(`/analytics/pareto/${projectId}`, { params: { source } }),
  getEqualization: (projectId: number) =>
    api.get(`/analytics/equalization/${projectId}`),
  getDisciplines: (projectId: number) =>
    api.get(`/analytics/disciplines/${projectId}`),
  getCategorias: (projectId: number) =>
    api.get(`/analytics/categorias/${projectId}`),
  exportExcel: (projectId: number) =>
    api.get(`/analytics/export/${projectId}`, { responseType: 'blob' }),
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

export default api
