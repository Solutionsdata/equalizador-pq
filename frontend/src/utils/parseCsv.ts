const PQ_HEADER_MAP: Record<string, string> = {
  'item': 'numero_item', 'no item': 'numero_item',
  'n item': 'numero_item', 'numero item': 'numero_item', 'num item': 'numero_item',
  'localidade': 'localidade', 'disciplina': 'disciplina',
  'categoria': 'categoria', 'codigo': 'codigo', 'cod': 'codigo',
  'descricao': 'descricao',
  'unidade': 'unidade', 'unidade medida': 'unidade', 'un': 'unidade', 'und': 'unidade',
  'quantidade': 'quantidade', 'qtd': 'quantidade', 'qtde': 'quantidade',
  'referencia': 'referencia_codigo', 'referencia codigo': 'referencia_codigo',
  'ref': 'referencia_codigo',
  'preco unit. rf': 'preco_referencia', 'preco unitario rf': 'preco_referencia',
  'preco referencia': 'preco_referencia', 'preco unit rf': 'preco_referencia',
  'p.unit. rf': 'preco_referencia',
  'observacao': 'observacao', 'obs': 'observacao',
}

const PROP_HEADER_MAP: Record<string, string> = {
  // ID interno — matching exato mesmo quando o Excel converte números de item
  '_pq_item_id': 'pq_id', '_id': 'pq_id', 'pq_item_id': 'pq_id',
  'item': 'numero_item', 'no item': 'numero_item', 'numero item': 'numero_item',
  'custo unit. direto sem reidi': 'cud_sem',
  'custo unit direto sem reidi': 'cud_sem',
  'bdi sem reidi (fracao)': 'bdi_sem',
  'bdi sem reidi': 'bdi_sem',
  'custo unit. direto com reidi': 'cud_com',
  'custo unit direto com reidi': 'cud_com',
  'bdi com reidi (fracao)': 'bdi_com',
  'bdi com reidi': 'bdi_com',
}

function norm(text: unknown): string {
  return String(text ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
}

function toFloat(v: unknown): number | null {
  if (v == null || v === '') return null
  // Handles both "1.500,50" (BR) and "1500.50" (EN) formats
  const s = String(v).replace('R$', '').trim()
  // If both . and , exist, the last one is the decimal separator
  const hasDot = s.includes('.')
  const hasComma = s.includes(',')
  let normalized: string
  if (hasDot && hasComma) {
    // e.g. "1.500,50" → remove dots (thousands), replace comma with dot
    normalized = s.replace(/\./g, '').replace(',', '.')
  } else {
    // Single separator: treat comma as decimal (BR) or dot as decimal (EN)
    normalized = s.replace(',', '.')
  }
  const n = parseFloat(normalized)
  return isFinite(n) ? n : null
}

function toStr(v: unknown): string | null {
  const s = String(v ?? '').trim()
  return s || null
}

/** Detects whether the first non-empty line uses ; or , as delimiter. */
function detectDelimiter(firstLine: string): string {
  const semis = (firstLine.match(/;/g) || []).length
  const commas = (firstLine.match(/,/g) || []).length
  return semis >= commas ? ';' : ','
}

function splitLine(line: string, sep: string): string[] {
  const cells: string[] = []
  let i = 0
  while (i <= line.length) {
    if (line[i] === '"') {
      i++
      let cell = ''
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { cell += '"'; i += 2 }
        else if (line[i] === '"') { i++; break }
        else { cell += line[i++] }
      }
      cells.push(cell)
      if (line[i] === sep) i++
    } else {
      const end = line.indexOf(sep, i)
      if (end === -1) { cells.push(line.slice(i).trim()); break }
      cells.push(line.slice(i, end).trim())
      i = end + 1
    }
  }
  return cells
}

function parseCsvText(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0) return []
  const sep = detectDelimiter(lines[0])
  return lines.map((l) => splitLine(l, sep))
}

export { parseCsvText }

export async function parseCsvFile(file: File): Promise<object[]> {
  const text = await file.text()
  const rows = parseCsvText(text)

  let headerIdx = -1
  let colMap: Record<number, string> = {}

  for (let ri = 0; ri < Math.min(10, rows.length); ri++) {
    const local: Record<number, string> = {}
    for (let ci = 0; ci < rows[ri].length; ci++) {
      const field = PQ_HEADER_MAP[norm(rows[ri][ci])]
      if (field) local[ci] = field
    }
    const vals = Object.values(local)
    if (vals.includes('numero_item') && vals.includes('descricao')) {
      headerIdx = ri
      colMap = local
      break
    }
  }

  if (headerIdx === -1) {
    throw new Error(
      'Cabeçalhos obrigatórios não encontrados (Item e Descrição). ' +
        'Use o template CSV gerado pelo sistema.'
    )
  }

  const items: object[] = []
  for (let ri = headerIdx + 1; ri < rows.length; ri++) {
    const row = rows[ri]
    const rd: Record<string, unknown> = {}
    for (const [ci, field] of Object.entries(colMap)) rd[field] = row[Number(ci)]

    const num = String(rd['numero_item'] ?? '').trim()
    const desc = String(rd['descricao'] ?? '').trim()
    if (!num || !desc) continue

    items.push({
      numero_item: num,
      localidade: toStr(rd['localidade']),
      disciplina: toStr(rd['disciplina']),
      categoria: toStr(rd['categoria']),
      codigo: toStr(rd['codigo']),
      descricao: desc,
      unidade: toStr(rd['unidade']) ?? 'un',
      quantidade: toFloat(rd['quantidade']) ?? 0,
      referencia_codigo: toStr(rd['referencia_codigo']),
      preco_referencia: toFloat(rd['preco_referencia']),
      observacao: toStr(rd['observacao']),
      ordem: items.length,
    })
  }

  if (items.length === 0)
    throw new Error('Nenhum item válido encontrado. Verifique se o arquivo usa o template CSV padrão.')

  return items
}

export interface ProposalPriceRow {
  pq_item_id: number
  preco_unitario: number | null
  bdi: number | null
  custo_unit_com_reidi: number | null
  bdi_com_reidi: number | null
}

export async function parseProposalCsvFile(
  file: File,
  numToId: Map<string, number>,
  idSet?: Set<number>          // conjunto de IDs válidos para validação do _pq_item_id
): Promise<ProposalPriceRow[]> {
  const text = await file.text()

  // Tenta diferentes delimitadores caso o Excel tenha salvo com delimitador diferente
  // Prioridade: ; > , > tab (nosso template usa ;)
  let rows: string[][] = []
  for (const sep of [';', ',', '\t']) {
    const candidate = parseCsvTextWithSep(text, sep)
    if (candidate.length > 1 && candidate[0].length >= 4) {
      rows = candidate
      break
    }
  }

  if (rows.length === 0) throw new Error('Arquivo vazio ou formato não reconhecido.')

  let headerIdx = -1
  let colMap: Record<string, number> = {}

  for (let ri = 0; ri < Math.min(10, rows.length); ri++) {
    const local: Record<string, number> = {}
    for (let ci = 0; ci < rows[ri].length; ci++) {
      const field = PROP_HEADER_MAP[norm(rows[ri][ci])]
      if (field) local[field] = ci
    }
    if ('numero_item' in local || 'pq_id' in local) {
      headerIdx = ri
      colMap = local
      break
    }
  }

  if (headerIdx === -1) {
    throw new Error(
      'Cabeçalho "Item" não encontrado. Use o template CSV gerado pelo sistema.'
    )
  }

  const hasPqId = 'pq_id' in colMap
  const result: ProposalPriceRow[] = []
  let skipped = 0

  for (let ri = headerIdx + 1; ri < rows.length; ri++) {
    const row = rows[ri]

    let pqId: number | undefined

    if (hasPqId) {
      // Matching exato por ID interno — imune a conversões do Excel
      const rawId = parseInt(String(row[colMap['pq_id']] ?? '').trim(), 10)
      if (!isNaN(rawId) && rawId > 0) {
        // Aceita se o ID está no conjunto de IDs válidos (ou se o conjunto não foi fornecido)
        if (!idSet || idSet.has(rawId)) {
          pqId = rawId
        }
      }
    }

    if (!pqId && 'numero_item' in colMap) {
      // Fallback: matching por numero_item (templates antigos sem coluna _pq_item_id)
      const rawNum = String(row[colMap['numero_item']] ?? '').trim()
      if (rawNum) {
        // Tenta exato, depois substitui vírgulas por pontos (Excel BR converte "1.1" → "1,1")
        pqId = numToId.get(rawNum) ?? numToId.get(rawNum.replace(/,/g, '.'))
      }
    }

    if (!pqId) {
      skipped++
      continue
    }

    const cudSem = toFloat(row[colMap['cud_sem']])
    const bdiSem = toFloat(row[colMap['bdi_sem']])
    const cudCom = toFloat(row[colMap['cud_com']])
    const bdiCom = toFloat(row[colMap['bdi_com']])

    if (cudSem === null && cudCom === null) continue

    result.push({
      pq_item_id: pqId,
      preco_unitario: cudSem,
      bdi: bdiSem,
      custo_unit_com_reidi: cudCom,
      bdi_com_reidi: bdiCom,
    })
  }

  if (result.length === 0)
    throw new Error('Nenhum preço encontrado. Preencha as colunas SEM REIDI ou COM REIDI e salve como CSV.')

  if (skipped > 0)
    console.warn(`CSV import: ${skipped} linha(s) ignoradas — item não encontrado na PQ.`)

  return result
}

/** Versão interna de parseCsvText que aceita separador explícito. */
function parseCsvTextWithSep(text: string, sep: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0) return []
  return lines.map((l) => splitLine(l, sep))
}
