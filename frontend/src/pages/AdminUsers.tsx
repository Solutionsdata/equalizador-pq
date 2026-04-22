import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Shield, ShieldOff, UserCheck, UserX, Trash2,
  RefreshCw, Crown, Clock, CheckCircle, XCircle,
  CalendarDays,
} from 'lucide-react'
import type { User } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function addMonths(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}

function assinaturaBadge(date?: string | null) {
  if (!date) return { label: 'Sem vencimento', color: 'bg-gray-100 text-gray-500' }
  const d = new Date(date)
  const now = new Date()
  if (d < now) return { label: `Vencida em ${d.toLocaleDateString('pt-BR')}`, color: 'bg-red-100 text-red-700' }
  const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const label = days <= 30
    ? `Vence em ${days}d (${d.toLocaleDateString('pt-BR')})`
    : `Válida até ${d.toLocaleDateString('pt-BR')}`
  return { label, color: 'bg-blue-100 text-blue-700' }
}

// ── Componentes ───────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      <UserCheck size={11} /> Ativo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
      <Clock size={11} /> Pendente
    </span>
  )
}

interface MonthsInputProps {
  userId: number
  onSave: (userId: number, months: number) => void
  pending: boolean
  currentDate?: string | null
}

function MonthsInput({ userId, onSave, pending, currentDate }: MonthsInputProps) {
  const [months, setMonths] = useState(1)
  const [open, setOpen] = useState(false)
  const badge = assinaturaBadge(currentDate)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.label}
      </span>
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-xs text-blue-600 hover:underline">
          Alterar
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={120}
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-0.5 text-xs w-16 text-center"
          />
          <span className="text-xs text-gray-500">mes{months !== 1 ? 'es' : ''}</span>
          <button
            onClick={() => { onSave(userId, months); setOpen(false) }}
            disabled={pending}
            className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            OK
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ── Painel de aprovação (inline, exige período obrigatório) ───────────────────

interface ApproveRowProps {
  u: User
  onConfirm: (userId: number, months: number) => void
  onReject: (userId: number) => void
  pending: boolean
}

function ApproveRow({ u, onConfirm, onReject, pending }: ApproveRowProps) {
  const [months, setMonths] = useState<number>(1)
  const [etapa, setEtapa] = useState<'idle' | 'choosing'>('idle')

  if (etapa === 'idle') {
    return (
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setEtapa('choosing')}
          disabled={pending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          <CheckCircle size={13} /> Aprovar
        </button>
        <button
          onClick={() => onReject(u.id)}
          disabled={pending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200 disabled:opacity-50"
        >
          <XCircle size={13} /> Reprovar
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-end gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
        <CalendarDays size={13} className="text-green-700" />
        <span className="text-xs text-green-700 font-medium">Período:</span>
        <input
          type="number"
          min={1}
          max={120}
          value={months}
          autoFocus
          onChange={(e) => setMonths(Math.max(1, Number(e.target.value)))}
          className="border border-green-300 rounded px-2 py-0.5 text-xs w-14 text-center"
        />
        <span className="text-xs text-green-700">mes{months !== 1 ? 'es' : ''}</span>
      </div>
      <button
        onClick={() => onConfirm(u.id, months)}
        disabled={pending || months < 1}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
      >
        <CheckCircle size={13} /> Confirmar
      </button>
      <button
        onClick={() => setEtapa('idle')}
        disabled={pending}
        className="px-2 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs hover:bg-gray-200"
      >
        Cancelar
      </button>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AdminUsers() {
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)

  if (me && !me.is_admin) return <Navigate to="/" replace />

  const isSuperAdmin = me?.email?.includes('solutionsdata') ?? false

  const { data: rawUsers, isLoading } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: () => adminAPI.listUsers().then(r => r.data),
  })
  const users: User[] = Array.isArray(rawUsers) ? rawUsers : []

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      adminAPI.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Usuário atualizado')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail ?? 'Erro ao atualizar')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminAPI.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Usuário excluído')
      setConfirmDelete(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail ?? 'Erro ao excluir')
    },
  })

  // Aprovação exige período obrigatório — envia is_active + assinatura_ate juntos
  function confirmarAprovacao(userId: number, months: number) {
    updateMutation.mutate({
      id: userId,
      data: {
        is_active: true,
        assinatura_ate: addMonths(months),
      },
    })
  }

  function reprovar(userId: number) {
    deleteMutation.mutate(userId)
  }

  function toggleAdmin(u: User) {
    updateMutation.mutate({ id: u.id, data: { is_admin: !u.is_admin } })
  }

  function toggleActive(u: User) {
    updateMutation.mutate({ id: u.id, data: { is_active: !u.is_active } })
  }

  function saveMonths(userId: number, months: number) {
    updateMutation.mutate({ id: userId, data: { assinatura_ate: addMonths(months) } })
  }

  const pending = users.filter(u => !u.is_active)
  const active = users.filter(u => u.is_active)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <RefreshCw size={20} className="animate-spin mr-2" /> Carregando…
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Crown size={24} className="text-amber-500" />
          Gestão de Usuários
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Aprove cadastros, gerencie acessos e defina validade de assinatura.
        </p>
      </div>

      {/* Seção: Aguardando Aprovação */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock size={15} />
            Aguardando aprovação ({pending.length})
          </h2>
          <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-amber-100">
                {pending.map(u => (
                  <tr key={u.id} className="hover:bg-amber-100/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {u.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.nome}</p>
                          <p className="text-gray-400 text-xs">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{u.empresa ?? '—'}</p>
                      <p className="text-xs text-gray-400">{u.cargo ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      Solicitado em {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <ApproveRow
                        u={u}
                        onConfirm={confirmarAprovacao}
                        onReject={reprovar}
                        pending={updateMutation.isPending || deleteMutation.isPending}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
            <CalendarDays size={12} /> Ao aprovar, defina obrigatoriamente o período de acesso em meses.
          </p>
        </div>
      )}

      {/* Seção: Usuários Ativos */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Usuários ativos ({active.length})
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Usuário</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Empresa</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Assinatura</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Cadastro</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {active.map(u => {
                const isMe = u.id === me?.id
                const isTargetSuperAdmin = u.email?.includes('solutionsdata') ?? false
                const canDelete = !isMe && !isTargetSuperAdmin && (!u.is_admin || isSuperAdmin)
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {u.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 flex items-center gap-1">
                            {u.nome}
                            {u.is_admin && <span title="Administrador"><Crown size={12} className="text-amber-500" /></span>}
                            {isMe && <span className="text-xs text-gray-400 font-normal">(você)</span>}
                          </p>
                          <p className="text-gray-400 text-xs">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{u.empresa ?? '—'}</p>
                      <p className="text-xs text-gray-400">{u.cargo ?? ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={u.is_active} />
                    </td>
                    <td className="px-4 py-3">
                      {u.is_admin ? (
                        <span className="text-xs text-gray-400 italic">Admin — isento</span>
                      ) : (
                        <MonthsInput
                          userId={u.id}
                          onSave={saveMonths}
                          pending={updateMutation.isPending}
                          currentDate={u.assinatura_ate}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Desativar acesso"
                          onClick={() => toggleActive(u)}
                          disabled={isMe || updateMutation.isPending}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <UserX size={16} />
                        </button>
                        <button
                          title={u.is_admin ? 'Remover admin' : 'Tornar admin'}
                          onClick={() => toggleAdmin(u)}
                          disabled={isMe || updateMutation.isPending}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            u.is_admin
                              ? 'text-amber-500 hover:bg-amber-50'
                              : 'text-gray-400 hover:bg-amber-50 hover:text-amber-500'
                          }`}
                        >
                          {u.is_admin ? <Shield size={16} /> : <ShieldOff size={16} />}
                        </button>
                        <button
                          title={
                            isTargetSuperAdmin ? 'Super administrador não pode ser excluído' :
                            u.is_admin && !isSuperAdmin ? 'Somente o super admin pode excluir admins' :
                            'Excluir usuário'
                          }
                          onClick={() => setConfirmDelete(u)}
                          disabled={!canDelete || deleteMutation.isPending}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {active.length === 0 && (
            <div className="text-center py-12 text-gray-400">Nenhum usuário ativo.</div>
          )}
        </div>
      </div>

      {/* Rodapé */}
      <div className="mt-4 flex gap-6 text-sm text-gray-400">
        <span>{users.length} usuário{users.length !== 1 ? 's' : ''} no total</span>
        <span className="text-amber-600">{pending.length} pendente{pending.length !== 1 ? 's' : ''}</span>
        <span>{active.length} ativo{active.length !== 1 ? 's' : ''}</span>
        <span className="text-red-500">
          {active.filter(u => u.assinatura_ate && new Date(u.assinatura_ate) < new Date()).length} com assinatura vencida
        </span>
      </div>

      {/* Modal confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir usuário?</h3>
            <p className="text-sm text-gray-500 mb-5">
              <strong>{confirmDelete.nome}</strong> e todos os seus projetos serão removidos permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
