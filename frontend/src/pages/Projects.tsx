import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { projectsAPI, sharingAPI } from '../services/api'
import type { Project, ProjectStatus, SharedUser } from '../types'
import { TIPO_OBRA_OPTIONS, SPE_OPTIONS, getTipoObraLabel, STATUS_LABELS } from '../types'
import toast from 'react-hot-toast'
import {
  Plus, FolderOpen, Table2, FileText, LineChart,
  Pencil, Trash2, X, Check, Share2, Users,
  UserPlus, UserMinus, Search,
} from 'lucide-react'

const STATUS_OPTIONS: ProjectStatus[] = ['EM_ANDAMENTO', 'CONCLUIDO', 'ARQUIVADO']

const STATUS_COLORS: Record<ProjectStatus, string> = {
  RASCUNHO: 'bg-blue-100 text-blue-700',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-700',
  CONCLUIDO: 'bg-green-100 text-green-700',
  ARQUIVADO: 'bg-gray-200 text-gray-400',
}

interface ProjectForm {
  nome: string
  descricao: string
  numero_licitacao: string
  tipo_obra: string
  outraTipoObra: string
  extensao_km: string
  spe_unidade: string
  status?: ProjectStatus
}

const EMPTY_FORM: ProjectForm = {
  nome: '', descricao: '', numero_licitacao: '', tipo_obra: 'Duplicação', outraTipoObra: '', extensao_km: '', spe_unidade: '',
}

export default function Projects() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<Project | null>(null)
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [shareSearch, setShareSearch] = useState('')

  const isOwnerEdit = modal === 'edit' && selected && !selected.is_shared

  const { data: allUsers = [] } = useQuery<{ id: number; nome: string; email: string }[]>({
    queryKey: ['users-list'],
    queryFn: () => sharingAPI.listUsers().then((r) => r.data),
    enabled: !!isOwnerEdit,
  })
  const { data: shares = [] } = useQuery<SharedUser[]>({
    queryKey: ['project-shares', selected?.id],
    queryFn: () => sharingAPI.listShares(selected!.id).then((r) => r.data),
    enabled: !!isOwnerEdit,
  })
  const sharedIds = new Set(shares.map((s) => s.id))

  const addShareMutation = useMutation({
    mutationFn: (userId: number) => sharingAPI.addShare(selected!.id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-shares', selected?.id] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Colaborador adicionado!')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? 'Erro ao compartilhar'),
  })
  const removeShareMutation = useMutation({
    mutationFn: (userId: number) => sharingAPI.removeShare(selected!.id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-shares', selected?.id] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Acesso removido.')
    },
    onError: () => toast.error('Erro ao remover acesso'),
  })

  const { data: _rawProjects, isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.list().then((r) => r.data),
  })
  const projects: Project[] = Array.isArray(_rawProjects) ? _rawProjects : []

  const createMutation = useMutation({
    mutationFn: (data: ProjectForm) => projectsAPI.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projeto criado! Adicione colaboradores abaixo.')
      openEdit(res.data as Project)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail
        ?? (err?.isServerStarting
          ? 'Servidor inicializando… tente novamente em 30 segundos.'
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
    const isKnown = TIPO_OBRA_OPTIONS.includes(project.tipo_obra)
    setForm({
      nome: project.nome,
      descricao: project.descricao ?? '',
      numero_licitacao: project.numero_licitacao ?? '',
      tipo_obra: isKnown ? project.tipo_obra : 'Outra',
      outraTipoObra: isKnown ? '' : project.tipo_obra,
      extensao_km: project.extensao_km != null ? String(project.extensao_km) : '',
      spe_unidade: project.spe_unidade ?? '',
      status: project.status,
    })
    setModal('edit')
  }

  function closeModal() { setModal(null); setSelected(null); setShareSearch('') }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const tipoObra = form.tipo_obra === 'Outra' ? (form.outraTipoObra.trim() || 'Outra') : form.tipo_obra
    const payload = {
      nome: form.nome,
      descricao: form.descricao,
      numero_licitacao: form.numero_licitacao,
      tipo_obra: tipoObra,
      extensao_km: form.extensao_km ? Number(form.extensao_km) : null,
      spe_unidade: form.spe_unidade || null,
      status: form.status,
    }
    if (modal === 'create') createMutation.mutate(payload as any)
    else if (modal === 'edit' && selected) updateMutation.mutate({ id: selected.id, data: payload })
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projetos</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {projects.filter((p) => !p.is_shared).length} próprio(s)
            {projects.some((p) => p.is_shared) && ` · ${projects.filter((p) => p.is_shared).length} compartilhado(s)`}
          </p>
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
                  {project.is_shared && project.owner_nome && (
                    <p className="text-xs text-blue-500 mt-0.5 flex items-center gap-1">
                      <Users size={11} /> Compartilhado por {project.owner_nome}
                    </p>
                  )}
                  {project.numero_licitacao && (
                    <p className="text-xs text-gray-400 mt-0.5">TR: {project.numero_licitacao}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[project.status]}`}>
                    {STATUS_LABELS[project.status]}
                  </span>
                  {!project.is_shared && (project.shared_with?.length ?? 0) > 0 && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Share2 size={10} /> {project.shared_with!.length} colaborador(es)
                    </span>
                  )}
                </div>
              </div>

              {/* Tipo, SPE e descrição */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">
                  {getTipoObraLabel(project.tipo_obra)}
                </span>
                {project.spe_unidade && (
                  <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-medium">
                    {project.spe_unidade}
                  </span>
                )}
                {project.extensao_km != null && (
                  <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded font-medium">
                    {Number(project.extensao_km).toFixed(3)} km
                  </span>
                )}
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

              {/* Editar / Compartilhar / Excluir */}
              <div className="flex gap-2">
                <button onClick={() => openEdit(project)} className="btn-secondary flex-1 text-xs py-1.5 justify-center">
                  <Pencil size={13} /> Editar
                </button>
                {!project.is_shared ? (
                  <>
                    <button
                      onClick={() => openEdit(project)}
                      className="flex items-center gap-1 text-xs py-1.5 px-3 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
                      title="Compartilhar projeto com colaboradores"
                    >
                      <Share2 size={13} /> Compartilhar
                    </button>
                    {deleteConfirm === project.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => deleteMutation.mutate(project.id)}
                          className="flex items-center justify-center gap-1 text-xs py-1.5 px-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                        >
                          <Check size={13} />
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
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {modal === 'create' ? 'Novo Projeto' : 'Editar Projeto'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
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
                      onChange={(e) => setForm((f) => ({ ...f, tipo_obra: e.target.value, outraTipoObra: '' }))}
                    >
                      {TIPO_OBRA_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {form.tipo_obra === 'Outra' && (
                      <input
                        className="input mt-1"
                        placeholder="Especifique o tipo de obra…"
                        value={form.outraTipoObra}
                        onChange={(e) => setForm((f) => ({ ...f, outraTipoObra: e.target.value }))}
                        required
                      />
                    )}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SPE — Unidade Contratante *</label>
                  <select
                    className="input"
                    value={form.spe_unidade}
                    onChange={(e) => setForm((f) => ({ ...f, spe_unidade: e.target.value }))}
                    required
                  >
                    <option value="">Selecione a empresa do grupo…</option>
                    {SPE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Extensão (km)
                    {form.tipo_obra === 'Duplicação' && (
                      <span className="ml-2 text-xs text-orange-600 font-normal">● obrigatório para duplicação</span>
                    )}
                  </label>
                  <input
                    className="input"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="Ex: 45.320"
                    value={form.extensao_km}
                    onChange={(e) => setForm((f) => ({ ...f, extensao_km: e.target.value }))}
                    required={form.tipo_obra === 'Duplicação'}
                  />
                  <p className="text-xs text-gray-400 mt-1">Usado para calcular o custo por km no Baseline.</p>
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

              {/* ── Collaborators section (edit modal, owner only) ── */}
              {isOwnerEdit && (
                <div className="mt-6 border-t border-gray-100 pt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={16} className="text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-800">Colaboradores</h3>
                    {shares.length > 0 && (
                      <span className="ml-auto text-xs text-gray-400">{shares.length} com acesso</span>
                    )}
                  </div>

                  {/* Active shares */}
                  {shares.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {shares.map((s) => (
                        <div key={s.id} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{s.nome}</p>
                            <p className="text-xs text-gray-400 truncate">{s.email}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeShareMutation.mutate(s.id)}
                            disabled={removeShareMutation.isPending}
                            className="ml-3 flex-shrink-0 flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded px-2 py-1 transition-colors"
                          >
                            <UserMinus size={13} /> Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* User search + add */}
                  <div className="relative mb-2">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      className="input pl-8 text-sm"
                      placeholder="Buscar usuário por nome ou e-mail…"
                      value={shareSearch}
                      onChange={(e) => setShareSearch(e.target.value)}
                    />
                  </div>

                  {shareSearch.trim() && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {allUsers
                        .filter(
                          (u) =>
                            !sharedIds.has(u.id) &&
                            (u.nome.toLowerCase().includes(shareSearch.toLowerCase()) ||
                              u.email.toLowerCase().includes(shareSearch.toLowerCase())),
                        )
                        .map((u) => (
                          <div key={u.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{u.nome}</p>
                              <p className="text-xs text-gray-400 truncate">{u.email}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => { addShareMutation.mutate(u.id); setShareSearch('') }}
                              disabled={addShareMutation.isPending}
                              className="ml-3 flex-shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded px-2 py-1 transition-colors"
                            >
                              <UserPlus size={13} /> Adicionar
                            </button>
                          </div>
                        ))}
                      {allUsers.filter(
                        (u) =>
                          !sharedIds.has(u.id) &&
                          (u.nome.toLowerCase().includes(shareSearch.toLowerCase()) ||
                            u.email.toLowerCase().includes(shareSearch.toLowerCase())),
                      ).length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-3">Nenhum usuário encontrado.</p>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-3">
                    Colaboradores têm acesso completo de edição ao projeto.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
