import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pqAPI, projectsAPI, revisionsAPI, downloadBlob } from '../services/api'
import type { PQItem, ProjectRevision } from '../types'
import { CATEGORIAS, DISCIPLINAS, UNIDADES, formatBRL } from '../types'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, Save, ArrowLeft,
  FileDown, FileUp, FileSpreadsheet, ChevronDown,
} from 'lucide-react'
import RevisionSelector from '../components/RevisionSelector'

type Row = Omit<PQItem, 'id' | 'project_id' | 'created_at'> & { _key: string }

function makeRow(ordem: number): Row {
  return {
    _key: crypto.randomUUID(),
    numero_item: '',
    codigo: '',
    descricao: '',
    unidade: 'm',
    quantidade: 0,
    categoria: '',
    disciplina: '',
    referencia_codigo: '',
    preco_referencia: undefined,
    observacao: '',
    ordem,
  }
}

function Cell({
  value, onChange, type = 'text', options, placeholder, className = '',
}: {
  value: string | number | undefined
  onChange: (v: string) => void
  type?: 'text' | 'number' | 'select'
  options?: string[]
  placeholder?: string
  className?: string
}) {
  if (type === 'select') {
    return (
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full text-xs border-0 bg-transparent focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 rounded px-1 py-1 ${className}`}
      >
        <option value="">—</option>
        {options?.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  return (
    <input
      type={type}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      step={type === 'number' ? 'any' : undefined}
      className={`w-full text-xs border-0 bg-transparent focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 rounded px-1 py-1 ${className}`}
    />
  )
}

export default function PQEditor() {
  const { projectId } = useParams<{ projectId: string }>()
  const pid = Number(projectId)
  const qc = useQueryClient()
  const importRef = useRef<HTMLInputElement>(null)
  const [excelMenu, setExcelMenu] = useState(false)
  const [importing, setImporting] = useState(false)
  const [currentRevisionId, setCurrentRevisionId] = useState<number | null>(null)

  const { data: project } = useQuery({
    queryKey: ['project', pid],
    queryFn: () => projectsAPI.get(pid).then((r) => r.data),
  })

  const { data: revisionsData } = useQuery<ProjectRevision[]>({
    queryKey: ['revisions', pid],
    queryFn: () => revisionsAPI.list(pid).then((r) => r.data),
  })
  const revisions: ProjectRevision[] = revisionsData ?? []

  useEffect(() => {
    if (revisions.length > 0 && currentRevisionId === null) {
      setCurrentRevisionId(revisions[revisions.length - 1].id)
    }
  }, [revisionsData])

  const { data: _rawItems, isLoading } = useQuery<PQItem[]>({
    queryKey: ['pq', pid, currentRevisionId],
    queryFn: () => pqAPI.list(pid, currentRevisionId ?? undefined).then((r) => r.data),
  })
  const serverItems: PQItem[] = Array.isArray(_rawItems) ? _rawItems : []

  const [rows, setRows] = useState<Row[]>([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (serverItems.length > 0) {
      setRows(serverItems.map((item, i) => ({ ...item, _key: String(item.id), ordem: i })))
    } else if (!isLoading) {
      setRows([makeRow(0)])
    }
  }, [serverItems, isLoading])

  const saveMutation = useMutation({
    mutationFn: (items: Row[]) =>
      pqAPI.bulkSave(pid, items.map(({ _key, ...rest }) => ({
        ...rest,
        quantidade: Number(rest.quantidade) || 0,
        preco_referencia: rest.preco_referencia ? Number(rest.preco_referencia) : null,
      }))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pq', pid] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Planilha PQ salva com sucesso!')
      setDirty(false)
    },
    onError: () => toast.error('Erro ao salvar a planilha'),
  })

  function updateRow(key: string, field: keyof Row, value: string) {
    setRows((prev) =>
      prev.map((r) => r._key === key ? { ...r, [field]: value } : r)
    )
    setDirty(true)
  }

  function addRow() {
    setRows((prev) => [...prev, makeRow(prev.length)])
    setDirty(true)
  }

  function deleteRow(key: string) {
    setRows((prev) => prev.filter((r) => r._key !== key))
    setDirty(true)
  }

  // ── Excel: download modelo vazio ─────────────────────────────────────────────
  async function handleDownloadTemplate() {
    setExcelMenu(false)
    const toastId = toast.loading('Gerando modelo…')
    try {
      const res = await pqAPI.downloadTemplate(pid)
      downloadBlob(res.data, `modelo_pq_${project?.nome ?? pid}.xlsx`)
      toast.success('Modelo baixado!', { id: toastId })
    } catch {
      toast.error('Erro ao gerar modelo', { id: toastId })
    }
  }

  // ── Excel: exportar dados atuais ─────────────────────────────────────────────
  async function handleExport() {
    setExcelMenu(false)
    const toastId = toast.loading('Exportando planilha…')
    try {
      const res = await pqAPI.exportExcel(pid)
      downloadBlob(res.data, `pq_${project?.nome ?? pid}.xlsx`)
      toast.success('Exportado!', { id: toastId })
    } catch {
      toast.error('Erro ao exportar', { id: toastId })
    }
  }

  // ── Excel: importar arquivo ───────────────────────────────────────────────────
  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // permite reimportar o mesmo arquivo

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Selecione um arquivo Excel (.xlsx ou .xls)')
      return
    }

    setImporting(true)
    const toastId = toast.loading('Importando planilha…')
    try {
      await pqAPI.importExcel(pid, file)
      await qc.invalidateQueries({ queryKey: ['pq', pid] })
      toast.success('Planilha importada com sucesso!', { id: toastId })
      setDirty(false)
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? 'Erro ao importar o arquivo'
      toast.error(detail, { id: toastId })
    } finally {
      setImporting(false)
      setExcelMenu(false)
    }
  }

  const totalRef = rows.reduce((acc, r) => {
    const qt = Number(r.quantidade) || 0
    const pr = Number(r.preco_referencia) || 0
    return acc + qt * pr
  }, 0)

  const columns = [
    { key: 'numero_item', label: 'Item', width: 'w-16', type: 'text' as const, placeholder: '1.1' },
    { key: 'codigo', label: 'Código', width: 'w-24', type: 'text' as const, placeholder: 'SINAPI' },
    { key: 'descricao', label: 'Descrição', width: 'w-64', type: 'text' as const, placeholder: 'Descrição do serviço' },
    { key: 'unidade', label: 'Un', width: 'w-20', type: 'select' as const, options: UNIDADES },
    { key: 'quantidade', label: 'Qtd', width: 'w-24', type: 'number' as const },
    { key: 'categoria', label: 'Categoria', width: 'w-36', type: 'select' as const, options: CATEGORIAS },
    { key: 'disciplina', label: 'Disciplina', width: 'w-28', type: 'select' as const, options: DISCIPLINAS },
    { key: 'referencia_codigo', label: 'Ref.', width: 'w-24', type: 'text' as const },
    { key: 'preco_referencia', label: 'Preço Ref. (R$)', width: 'w-32', type: 'number' as const },
    { key: 'observacao', label: 'Obs.', width: 'w-32', type: 'text' as const },
  ]

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Link to="/projetos" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Planilha PQ</h1>
            <p className="text-sm text-gray-500">{project?.nome}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            Total referência: <strong className="text-gray-800">{formatBRL(totalRef)}</strong>
          </span>

          {/* Menu Excel */}
          <div className="relative">
            <button
              onClick={() => setExcelMenu((v) => !v)}
              disabled={importing}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <FileSpreadsheet size={15} className="text-green-600" />
              Excel
              <ChevronDown size={13} />
            </button>
            {excelMenu && (
              <>
                {/* overlay para fechar */}
                <div className="fixed inset-0 z-10" onClick={() => setExcelMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-48 py-1 overflow-hidden">
                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <FileDown size={15} className="text-blue-500" />
                    Baixar Modelo Vazio
                  </button>
                  <button
                    onClick={handleExport}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <FileDown size={15} className="text-green-600" />
                    Exportar com Dados
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => importRef.current?.click()}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <FileUp size={15} className="text-orange-500" />
                    Importar Excel
                    <span className="ml-auto text-xs text-gray-400">substitui tudo</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Input oculto para importação */}
          <input
            ref={importRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFile}
          />

          <button onClick={addRow} className="btn-secondary text-sm">
            <Plus size={15} /> Adicionar linha
          </button>
          <button
            onClick={() => saveMutation.mutate(rows)}
            disabled={saveMutation.isPending || !dirty}
            className="btn-primary text-sm"
          >
            <Save size={15} />
            {saveMutation.isPending ? 'Salvando…' : dirty ? 'Salvar*' : 'Salvo'}
          </button>
        </div>
      </div>

      {/* Revision selector banner */}
      {revisions.length > 0 && (
        <div className="mb-4">
          <RevisionSelector
            projectId={pid}
            revisions={revisions}
            currentRevisionId={currentRevisionId}
            onRevisionChange={(rev) => setCurrentRevisionId(rev.id)}
            onRevisionCreated={(rev) => setCurrentRevisionId(rev.id)}
          />
        </div>
      )}

      {/* Tabela — 10 colunas de negócio */}
      {isLoading || importing ? (
        <div className="text-center py-20 text-gray-400">
          {importing ? 'Importando planilha…' : 'Carregando planilha…'}
        </div>
      ) : (
        <div className="card overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-xs">
                <th className="w-8 px-2 py-3 text-left font-semibold">#</th>
                {columns.map((col) => (
                  <th key={col.key} className={`${col.width} px-2 py-3 text-left font-semibold whitespace-nowrap`}>
                    {col.label}
                  </th>
                ))}
                <th className="w-10 px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row._key} className="border-t border-gray-100 hover:bg-blue-50/30 group">
                  <td className="px-2 py-1 text-center text-xs text-gray-400 font-mono">{idx + 1}</td>
                  {columns.map((col) => (
                    <td key={col.key} className="px-1 py-0.5">
                      <Cell
                        value={row[col.key as keyof Row] as string | number | undefined}
                        onChange={(v) => updateRow(row._key, col.key as keyof Row, v)}
                        type={col.type}
                        options={col.options}
                        placeholder={col.placeholder}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1">
                    <button
                      onClick={() => deleteRow(row._key)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-sm">
                <td colSpan={9} className="px-3 py-2 text-right text-gray-600">
                  Total Referência:
                </td>
                <td className="px-2 py-2 text-gray-800">{formatBRL(totalRef)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          {rows.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-gray-400 text-sm">Nenhum item cadastrado.</p>
              <button onClick={addRow} className="btn-primary mt-3 text-sm mx-auto">
                <Plus size={15} /> Adicionar primeiro item
              </button>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        Planilha PQ · 10 colunas · {rows.length} itens · Clique em qualquer célula para editar · Salve para confirmar
      </p>
    </div>
  )
}
