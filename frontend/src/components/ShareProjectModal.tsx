import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sharingAPI } from '../services/api'
import type { Project, SharedUser } from '../types'
import { X, Users, UserPlus, UserMinus, Search } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  project: Project
  onClose: () => void
}

interface UserListItem {
  id: number
  nome: string
  email: string
}

export default function ShareProjectModal({ project, onClose }: Props) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery<UserListItem[]>({
    queryKey: ['users-list'],
    queryFn: () => sharingAPI.listUsers().then((r) => r.data),
  })

  const { data: shares = [], isLoading: loadingShares } = useQuery<SharedUser[]>({
    queryKey: ['project-shares', project.id],
    queryFn: () => sharingAPI.listShares(project.id).then((r) => r.data),
  })

  const sharedIds = new Set(shares.map((s) => s.id))

  const addMutation = useMutation({
    mutationFn: (userId: number) => sharingAPI.addShare(project.id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-shares', project.id] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Acesso concedido!')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Erro ao compartilhar'),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: number) => sharingAPI.removeShare(project.id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-shares', project.id] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Acesso removido.')
    },
    onError: () => toast.error('Erro ao remover acesso'),
  })

  const filtered = allUsers.filter(
    (u) =>
      u.nome.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  )

  const isLoading = loadingUsers || loadingShares
  const isPending = addMutation.isPending || removeMutation.isPending

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Users size={18} className="text-blue-600" />
              Compartilhar Projeto
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[280px]">{project.nome}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Current shares */}
        {shares.length > 0 && (
          <div className="px-6 pt-4 pb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Com acesso ({shares.length})
            </p>
            <div className="space-y-1.5">
              {shares.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.nome}</p>
                    <p className="text-xs text-gray-400 truncate">{s.email}</p>
                  </div>
                  <button
                    onClick={() => removeMutation.mutate(s.id)}
                    disabled={isPending}
                    className="ml-2 flex-shrink-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded p-1 transition-colors"
                    title="Remover acesso"
                  >
                    <UserMinus size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-6 py-3 border-t border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-8 text-sm"
              placeholder="Buscar usuário por nome ou e-mail…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto px-6 pb-5">
          {isLoading ? (
            <p className="text-center text-gray-400 py-6 text-sm">Carregando usuários…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">Nenhum usuário encontrado.</p>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((u) => {
                const hasAccess = sharedIds.has(u.id)
                return (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${
                      hasAccess ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{u.nome}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    {hasAccess ? (
                      <button
                        onClick={() => removeMutation.mutate(u.id)}
                        disabled={isPending}
                        className="ml-2 flex-shrink-0 flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded px-2 py-1 transition-colors"
                      >
                        <UserMinus size={13} /> Remover
                      </button>
                    ) : (
                      <button
                        onClick={() => addMutation.mutate(u.id)}
                        disabled={isPending}
                        className="ml-2 flex-shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded px-2 py-1 transition-colors"
                      >
                        <UserPlus size={13} /> Adicionar
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
          Colaboradores têm acesso completo de edição ao projeto.
        </div>
      </div>
    </div>
  )
}
