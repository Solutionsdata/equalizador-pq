import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { projectsAPI } from '../services/api'
import type { Project, WorkType, ProjectStatus } from '../types'
import { TIPO_OBRA_LABELS, STATUS_LABELS } from '../types'
import toast from 'react-hot-toast'
import {
  Plus, FolderOpen, Table2, FileText, LineChart,
  Pencil, Trash2, X, Check,
} from 'lucide-react'

const TIPO_OPTIONS: WorkType[] = ['INFRAESTRUTURA', 'EDIFICACAO', 'OBRA_DE_ARTE']
const STATUS_OPTIONS: ProjectStatus[] = ['RASCUNHO', 'EM_ANDAMENTO', 'CONCLUIDO', 'ARQUIVADO']

const STATUS_COLORS: Record<ProjectStatus, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-600',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-700',
  CONCLUIDO: 'bg-green-100 text-green-700',
  ARQUIVADO: 'bg-gray-200 text-gray-400',
}

interface ProjectForm {
  nome: string
  descricao: string
  numero_licitacao: string
  tipo_obra: WorkType
  status?: ProjectStatus
}

const EMPTY_FORM: ProjectForm = {
  nome: '', descricao: '', numero_licitacao: '', tipo_obra: 'INFRAESTRUTURA',
}

export default function Projects() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<Project | null>(null)
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const { data: _rawProjects, isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.list().then((r) => r.data),
  })
  const projects: Project[] = Array.isArray(_rawProjects) ? _rawProjects : []

  const createMutation = useMutation({
    mutationFn: (data: ProjectForm) => projectsAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projeto criado!')
      closeModal()
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail
        ?? (err?.code === 'ERR_NETWORK' || !err?.response
          ? 'Servidor iniciando… aguarde 30s e tente novamente.'
          : 'Erro ao criar projeto')
      toast.error(msg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => projectsAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projeto atualizado!')
      closeModal()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Erro ao atualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectsAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projeto excluído.')
      setDeleteConfirm(null)
    },
    onError: () => toast.error('Erro ao excluir projeto'),
  })

  function openCreate() {
    setForm(EMPTY_FORM)
    setModal('create')
  }

  function openEdit(project: Project) {
    setSelected(project)
    setForm({
      nome: project.nome,
      descricao: project.descricao ?? '',
      numero_licitacao: project.numero_licitacao ?? '',
      tipo_obra: project.tipo_obra,
      status: project.status,
    })
    setModal('edit')
  }

  function closeModal() { setModal(null); setSelected(null) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (modal === 'create') createMutation.mutate(form)
    else if (modal === 'edit' && selected) updateMutation.mutate({ id: selected.id, data: form })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projetos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{projects.length} projeto(s) cadastrado(s)</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={18} /> Novo Projeto
        </button>
      </div>

      {/* Grid de projetos */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Carregando…</div>
      ) : projects.length === 0 ? (
        <div className="card py-20 text-center">
          <FolderOpen size={56} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400 mb-4">Nenhum projeto cadastrado.</p>
          <button onClick={openCreate} className="btn-primary mx-auto">
            <Plus size={16} /> Criar primeiro projeto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="card p-5 flex flex-col gap-3">
              {/* Header do card */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{project.nome}</h3>
                  {project.numero_licitacao && (
                    <p className="text-xs text-gray-400 mt-0.5">TR: {project.numero_licitacao}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[project.status]}`}>
                  {STATUS_LABELS[project.status]}
                </span>
              </div>

              {/* Tipo e descrição */}
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">
                  {TIPO_OBRA_LABELS[project.tipo_obra]}
                </span>
              </div>
              {project.descricao && (
                <p className="text-sm text-gray-500 line-clamp-2">{project.descricao}</p>
              )}

              {/* Contadores */}
              <div className="flex gap-4 text-sm text-gray-400 border-t border-gray-100 pt-3">
                <span className="flex items-center gap-1">
                  <Table2 size={14} className="text-gray-300" />
                  {project.total_pq_items} itens
                </span>
                <span className="flex items-center gap-1">
                  <FileText size={14} className="text-gray-300" />
                  {project.total_proposals}/10 propostas
                </span>
              </div>

              {/* Ações */}
              <div className="flex gap-2 pt-1">
                <Link
                  to={`/projetos/${project.id}/pq`}
                  className="flex-1 text-center text-xs py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <Table2 size={13} /> Planilha PQ
                </Link>
                <Link
                  to={`/projetos/${project.id}/equalizacao`}
                  className="flex-1 text-center text-xs py-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <FileText size={13} /> Equalizar
                </Link>
                <Link
                  to={`/projetos/${project.id}/analises`}
                  className="flex-1 text-center text-xs py-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <LineChart size={13} /> Análises
                </Link>
              </div>

              {/* Editar / Excluir */}
              <div className="flex gap-2">
                <button onClick={() => openEdit(project)} className="btn-secondary flex-1 text-xs py-1.5 justify-center">
                  <Pencil size={13} /> Editar
                </button>
                {deleteConfirm === project.id ? (
                  <div className="flex gap-1 flex-1">
                    <button
                      onClick={() => deleteMutation.mutate(project.id)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700"
                    >
                      <Check size={13} /> Confirmar
                    </button>
                    <button onClick={() => setDeleteConfirm(null)} className="btn-secondary text-xs py-1.5 px-2">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(project.id)}
                    className="btn-secondary text-xs py-1.5 px-3 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                {modal === 'create' ? 'Novo Projeto' : 'Editar Projeto'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Projeto *</label>
                <input
                  className="input"
                  placeholder="Ex: Recuperação do Lote KM 45-120"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Obra *</label>
                  <select
                    className="input"
                    value={form.tipo_obra}
                    onChange={(e) => setForm((f) => ({ ...f, tipo_obra: e.target.value as WorkType }))}
                  >
                    {TIPO_OPTIONS.map((t) => (
                      <option key={t} value={t}>{TIPO_OBRA_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nº Termo de Referência</label>
                  <input
                    className="input"
                    placeholder="TR-2024/001"
                    value={form.numero_licitacao}
                    onChange={(e) => setForm((f) => ({ ...f, numero_licitacao: e.target.value }))}
                  />
                </div>
              </div>

              {modal === 'edit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="input"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProjectStatus }))}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Detalhes da obra, localização, extensão…"
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1 justify-center">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary flex-1 justify-center"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
