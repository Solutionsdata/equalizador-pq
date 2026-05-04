import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { projectsAPI, sharingAPI } from '../services/api'
import type { Project, ProjectStatus, SharedUser } from '../types'
import { TIPO_OBRA_OPTIONS, SPE_OPTIONS, getTipoObraLabel, STATUS_LABELS } from '../types'
import toast from 'react-hot-toast'
import {
  Plus, FolderOpen, Table2, FileText, LineChart,
  Pencil, Trash2, X, Check, Share2, Users, Search,
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
  nome: '', descricao: '', numero_licitacao: '', tipo_obra: 'Duplicação',
  outraTipoObra: '', extensao_km: '', spe_unidade: '',
}

export default function Projects() {
  const qc = useQueryClient()

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [selected, setSelected] = useState<Project | null>(null)
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // ── Collaborators state ──────────────────────────────────────────────────────
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<Set<number>>(new Set())
  const [collaboratorSearch, setCollaboratorSearch] = useState('')
  const [sharesInitialized, setSharesInitialized] = useState(false)

  // Is the current user the owner (can manage collaborators)?
  const isOwner = modal === 'create' || (modal === 'edit' && selected != null && !selected.is_shared)

  // Load all available users when the modal is open and user is owner
  const { data: allUsers = [] } = useQuery<{ id: number; nome: string; email: string }[]>({
    queryKey: ['users-list'],
    queryFn: () => sharingAPI.listUsers().then((r) => r.data),
    enabled: !!modal && isOwner,
    staleTime: 5 * 60 * 1000,
  })

  // Load current shares when editing an owned project
  const { data: shares = [] } = useQuery<SharedUser[]>({
    queryKey: ['project-shares', selected?.id],
    queryFn: () => sharingAPI.listShares(selected!.id).then((r) => r.data),
    enabled: modal === 'edit' && selected != null && !selected.is_shared,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  // Initialize checkbox selection from shares when edit modal loads
  useEffect(() => {
    if (modal === 'edit' && !sharesInitialized) {
      setSelectedCollaboratorIds(new Set(shares.map((s) => s.id)))
      if (shares.length > 0 || selected != null) setSharesInitialized(true)
    }
  }, [shares, modal, sharesInitialized, selected])

  // ── Projects list ────────────────────────────────────────────────────────────
  const { data: _raw, isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.list().then((r) => r.data),
  })
  const projects: Project[] = Array.isArray(_raw) ? _raw : []

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function openCreate() {
    setForm(EMPTY_FORM)
    setSelected(null)
    setSelectedCollaboratorIds(new Set())
    setSharesInitialized(false)
    setCollaboratorSearch('')
    setModal('create')
  }

  function openEdit(project: Project) {
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
    setSelected(project)
    setSelectedCollaboratorIds(new Set())
    setSharesInitialized(false)
    setCollaboratorSearch('')
    setModal('edit')
  }

  function closeModal() {
    setModal(null)
    setSelected(null)
    setSelectedCollaboratorIds(new Set())
    setSharesInitialized(false)
    setCollaboratorSearch('')
  }

  function toggleCollaborator(userId: number) {
    setSelectedCollaboratorIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  // ── Submit (create or edit + collaborator sync) ───────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)

    const tipoObra =
      form.tipo_obra === 'Outra' ? (form.outraTipoObra.trim() || 'Outra') : form.tipo_obra
    const payload = {
      nome: form.nome,
      descricao: form.descricao,
      numero_licitacao: form.numero_licitacao,
      tipo_obra: tipoObra,
      extensao_km: form.extensao_km ? Number(form.extensao_km) : null,
      spe_unidade: form.spe_unidade || null,
      status: form.status,
    }

    try {
      if (modal === 'create') {
        const res = await projectsAPI.create(payload)
        const newId = (res.data as Project).id
        // Add all selected collaborators
        for (const userId of selectedCollaboratorIds) {
          await sharingAPI.addShare(newId, userId)
        }
        qc.invalidateQueries({ queryKey: ['projects'] })
        toast.success('Projeto criado com sucesso!')
        closeModal()
      } else if (modal === 'edit' && selected) {
        await projectsAPI.update(selected.id, payload)
        // Sync collaborators (only owner can manage)
        if (!selected.is_shared) {
          const currentSharedIds = new Set(shares.map((s) => s.id))
          for (const userId of selectedCollaboratorIds) {
            if (!currentSharedIds.has(userId)) {
              await sharingAPI.addShare(selected.id, userId)
            }
          }
          for (const userId of currentSharedIds) {
            if (!selectedCollaboratorIds.has(userId)) {
              await sharingAPI.removeShare(selected.id, userId)
            }
          }
        }
        qc.invalidateQueries({ queryKey: ['projects'] })
        qc.invalidateQueries({ queryKey: ['project-shares', selected.id] })
        toast.success('Projeto atualizado!')
        closeModal()
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ??
        (err?.isServerStarting
          ? 'Servidor inicializando… tente novamente em 30 segundos.'
          : 'Erro ao salvar projeto')
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }

  // ── Filtered users list for picker ───────────────────────────────────────────
  const filteredUsers = allUsers.filter(
    (u) =>
      !collaboratorSearch.trim() ||
      u.nome.toLowerCase().includes(collaboratorSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(collaboratorSearch.toLowerCase()),
  )

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projetos</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {projects.filter((p) => !p.is_shared).length} próprio(s)
            {projects.some((p) => p.is_shared) &&
              ` · ${projects.filter((p) => p.is_shared).length} compartilhado(s)`}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={18} /> Novo Projeto
        </button>
      </div>

      {/* Project grid */}
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
              {/* Card header */}
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

              {/* Tags */}
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

              {/* Counters */}
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

              {/* Navigation */}
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

              {/* Edit / Delete */}
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(project)}
                  className="btn-secondary flex-1 text-xs py-1.5 justify-center"
                >
                  <Pencil size={13} /> Editar
                </button>
                {!project.is_shared && (
                  <>
                    {deleteConfirm === project.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            projectsAPI.delete(project.id).then(() => {
                              qc.invalidateQueries({ queryKey: ['projects'] })
                              toast.success('Projeto excluído.')
                              setDeleteConfirm(null)
                            }).catch(() => toast.error('Erro ao excluir projeto'))
                          }}
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
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ──────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {modal === 'create' ? 'Novo Projeto' : 'Editar Projeto'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <form onSubmit={handleSubmit} id="project-form" className="space-y-4">

                {/* Nome */}
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

                {/* Tipo de Obra + Nº TR */}
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

                {/* SPE */}
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

                {/* Extensão km */}
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

                {/* Status (edit only) */}
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

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    className="input resize-none"
                    rows={2}
                    placeholder="Detalhes da obra, localização, extensão…"
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  />
                </div>

                {/* ── Collaborators picker (owner only) ── */}
                {isOwner && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Section header */}
                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <Users size={15} className="text-blue-600" />
                        <span className="text-sm font-semibold text-gray-800">Colaboradores</span>
                        <span className="text-xs text-gray-400">— podem editar, mas não excluir</span>
                      </div>
                      {selectedCollaboratorIds.size > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          {selectedCollaboratorIds.size} selecionado(s)
                        </span>
                      )}
                    </div>

                    <div className="p-3">
                      {/* Search filter */}
                      <div className="relative mb-2">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          className="input pl-8 text-sm py-1.5"
                          placeholder="Filtrar por nome ou e-mail…"
                          value={collaboratorSearch}
                          onChange={(e) => setCollaboratorSearch(e.target.value)}
                        />
                      </div>

                      {/* User list */}
                      {allUsers.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">
                          Nenhum outro usuário cadastrado no sistema.
                        </p>
                      ) : filteredUsers.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">
                          Nenhum usuário encontrado para "{collaboratorSearch}".
                        </p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {filteredUsers.map((u) => {
                            const checked = selectedCollaboratorIds.has(u.id)
                            return (
                              <label
                                key={u.id}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                  checked
                                    ? 'bg-blue-50 border border-blue-200'
                                    : 'bg-white border border-transparent hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded text-blue-600 flex-shrink-0"
                                  checked={checked}
                                  onChange={() => toggleCollaborator(u.id)}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-800 truncate">{u.nome}</p>
                                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                                </div>
                                {checked && (
                                  <span className="text-xs text-blue-600 font-medium flex-shrink-0">✓ Selecionado</span>
                                )}
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit buttons */}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal} className="btn-secondary flex-1 justify-center">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn-primary flex-1 justify-center"
                  >
                    {isSaving ? 'Salvando…' : modal === 'create' ? 'Criar Projeto' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
