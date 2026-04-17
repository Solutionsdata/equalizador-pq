import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { revisionsAPI } from '../services/api'
import type { ProjectRevision } from '../types'
import toast from 'react-hot-toast'
import { GitBranch, ChevronDown, Plus, X, Check } from 'lucide-react'

interface Props {
  projectId: number
  revisions: ProjectRevision[]
  currentRevisionId: number | null
  onRevisionChange: (revision: ProjectRevision) => void
  onRevisionCreated?: (revision: ProjectRevision) => void
}

export default function RevisionSelector({
  projectId,
  revisions,
  currentRevisionId,
  onRevisionChange,
  onRevisionCreated,
}: Props) {
  const qc = useQueryClient()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [descricao, setDescricao] = useState('')

  const current = revisions.find((r) => r.id === currentRevisionId) ?? revisions[0]
  const nextNumero = revisions.length > 0 ? Math.max(...revisions.map((r) => r.numero)) + 1 : 0

  const createMutation = useMutation({
    mutationFn: (data: { numero: number; descricao?: string }) =>
      revisionsAPI.create(projectId, data).then((r) => r.data),
    onSuccess: (newRev: ProjectRevision) => {
      qc.invalidateQueries({ queryKey: ['revisions', projectId] })
      toast.success(`Revisão ${newRev.numero} criada`)
      setModalOpen(false)
      setDescricao('')
      onRevisionCreated?.(newRev)
    },
    onError: () => toast.error('Erro ao criar revisão'),
  })

  function handleCreate() {
    createMutation.mutate({ numero: nextNumero, descricao: descricao || undefined })
  }

  return (
    <>
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm">
        <GitBranch size={14} className="text-blue-600 flex-shrink-0" />

        {/* Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-1.5 font-semibold text-gray-800 hover:text-blue-600 transition-colors"
          >
            Rev. {current?.numero ?? '—'}
            {current?.descricao && (
              <span className="font-normal text-gray-500 text-xs">— {current.descricao}</span>
            )}
            <ChevronDown size={12} className="text-gray-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[220px] py-1">
              {revisions.map((rev) => (
                <button
                  key={rev.id}
                  onClick={() => {
                    onRevisionChange(rev)
                    setDropdownOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${
                    rev.id === currentRevisionId ? 'text-blue-600 font-semibold' : 'text-gray-700'
                  }`}
                >
                  <span>
                    <span className="font-mono">Rev. {rev.numero}</span>
                    {rev.descricao && (
                      <span className="ml-2 text-xs text-gray-400">{rev.descricao}</span>
                    )}
                  </span>
                  {rev.id === currentRevisionId && <Check size={12} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Nova Revisão */}
        <button
          onClick={() => { setModalOpen(true); setDropdownOpen(false) }}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus size={12} /> Nova Revisão
        </button>
      </div>

      {/* Click-away to close dropdown */}
      {dropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
      )}

      {/* Modal: criar revisão */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Nova Revisão</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Número
                </label>
                <div className="text-2xl font-bold text-blue-600">{nextNumero}</div>
                <p className="text-xs text-gray-400 mt-0.5">Auto-incrementado</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Ajuste de quantitativos"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="flex-1 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {createMutation.isPending ? 'Criando…' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
