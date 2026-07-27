import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { moverParaLixeira } from './lixeira'

// ============================================================================
// CUIDADORAS — controle PESSOAL da KA (não é parte do negócio de design).
// Ficha de cada cuidadora + documentos anexados (RG, CPF, comprovantes…).
//
// Armazenamento: Firestore. Como o plano grátis (Spark) não inclui o Storage,
// cada documento vira um data URL comprimido num documento próprio da
// subcoleção `cuidadoras/{id}/documentos` (limite do Firestore: 1 MB por
// documento). Imagens são comprimidas no navegador; PDFs valem até ~600 KB.
// ============================================================================

export type CuidadoraStatus = 'pendente' | 'ativa' | 'inativa'

export interface Cuidadora {
  id: string
  nome: string
  cpf: string | null
  rg: string | null
  /** Número do PIS/PASEP/NIT (dado de RH). */
  pis: string | null
  telefone: string | null
  email: string | null
  data_nascimento: string | null // AAAA-MM-DD
  endereco: string | null
  cidade: string | null
  /** Chave PIX (o número/valor). */
  pix_chave: string | null
  /** Banco do PIX (ex.: Nubank, Caixa…). */
  pix_banco: string | null
  /** Tipo da chave PIX: 'telefone' | 'cpf' | 'email' | 'aleatoria'. */
  pix_tipo: string | null
  /** Data de início do trabalho. */
  inicio: string | null // AAAA-MM-DD
  status: CuidadoraStatus
  observacoes: string | null
  /** 'auto-cadastro' quando veio do link público /cadastro-cuidadora. */
  origem: string | null
  /** false enquanto a KA ainda não abriu a ficha de um cadastro novo. */
  revisado: boolean
  /** true enquanto a pessoa ainda está preenchendo (auto-salvo, não enviou). */
  rascunho?: boolean
  criado_em: string
}

export interface DocumentoCuidadora {
  id: string
  nome: string // ex.: "RG (frente).jpg"
  tipo: string // mime type
  tamanho: number // bytes originais
  dataUrl: string // conteúdo (base64), já comprimido se imagem
  criado_em: string
}

const agora = () => new Date().toISOString()

function comId<T>(id: string, data: Record<string, unknown>): T {
  return { id, ...data } as T
}

function limpar<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v
  return out as T
}

// ---- CRUD da cuidadora -------------------------------------------------------

export type FichaCuidadora = Partial<
  Omit<Cuidadora, 'id' | 'criado_em' | 'origem' | 'revisado'>
> & { nome: string }

export async function listarCuidadoras(): Promise<Cuidadora[]> {
  const snap = await getDocs(query(collection(db, 'cuidadoras'), orderBy('criado_em', 'desc')))
  return snap.docs.filter((d) => !d.data().excluido_em).map((d) => comId<Cuidadora>(d.id, d.data()))
}

export async function criarCuidadora(dados: FichaCuidadora): Promise<Cuidadora> {
  const novo = limpar({
    nome: dados.nome,
    cpf: dados.cpf ?? null,
    rg: dados.rg ?? null,
    pis: dados.pis ?? null,
    telefone: dados.telefone ?? null,
    email: dados.email ?? null,
    data_nascimento: dados.data_nascimento ?? null,
    endereco: dados.endereco ?? null,
    cidade: dados.cidade ?? null,
    pix_chave: dados.pix_chave ?? null,
    pix_banco: dados.pix_banco ?? null,
    pix_tipo: dados.pix_tipo ?? null,
    inicio: dados.inicio ?? null,
    status: dados.status ?? 'ativa',
    observacoes: dados.observacoes ?? null,
    origem: 'manual',
    revisado: true,
    criado_em: agora(),
  })
  const ref = await addDoc(collection(db, 'cuidadoras'), novo)
  return comId<Cuidadora>(ref.id, novo)
}

export async function salvarCuidadora(id: string, dados: Partial<FichaCuidadora>): Promise<Cuidadora> {
  await updateDoc(doc(db, 'cuidadoras', id), limpar({ ...dados }))
  const d = await getDoc(doc(db, 'cuidadoras', id))
  return comId<Cuidadora>(d.id, d.data() ?? {})
}

export async function marcarCuidadoraRevisada(id: string): Promise<void> {
  await updateDoc(doc(db, 'cuidadoras', id), { revisado: true })
}

export async function excluirCuidadora(id: string): Promise<void> {
  // Vai para a Lixeira (mantém os documentos anexados para poder restaurar).
  await moverParaLixeira('cuidadoras', id)
}

// ---- Cadastro público (link para a nova cuidadora) ---------------------------

export function linkPublicoCadastroCuidadora(): string {
  return `${window.location.origin}/cadastro-cuidadora`
}

// Só os campos da ficha (para gravar sem os campos de controle).
function camposFicha(d: Partial<FichaCuidadora>) {
  return {
    nome: d.nome,
    cpf: d.cpf ?? null,
    rg: d.rg ?? null,
    pis: d.pis ?? null,
    telefone: d.telefone ?? null,
    email: d.email ?? null,
    data_nascimento: d.data_nascimento ?? null,
    endereco: d.endereco ?? null,
    cidade: d.cidade ?? null,
    pix_chave: d.pix_chave ?? null,
    pix_banco: d.pix_banco ?? null,
    pix_tipo: d.pix_tipo ?? null,
    observacoes: d.observacoes ?? null,
  }
}

/** Cadastro feito pela própria cuidadora pelo link público (envio direto). */
export async function cadastrarCuidadoraPublico(
  dados: FichaCuidadora,
  arquivos: PreparadoParaAnexo[] = [],
): Promise<void> {
  const novo = limpar({
    ...camposFicha(dados),
    inicio: null,
    status: 'pendente' as CuidadoraStatus,
    origem: 'auto-cadastro',
    revisado: false,
    rascunho: false,
    criado_em: agora(),
  })
  const ref = await addDoc(collection(db, 'cuidadoras'), novo)
  for (const arq of arquivos) await anexarDocumento(ref.id, arq)
}

// ---- Auto-salvamento do cadastro público (rascunho) --------------------------
// A pessoa começa a preencher e o sistema já vai salvando: cria um rascunho na
// 1ª vez (precisa do nome) e atualiza a cada mudança. Assim nada se perde mesmo
// que ela não clique em "Enviar".

/** Cria o rascunho da cuidadora (auto-cadastro em preenchimento) e devolve o id. */
export async function criarRascunhoCuidadora(dados: FichaCuidadora): Promise<string> {
  const novo = limpar({
    ...camposFicha(dados),
    inicio: null,
    status: 'pendente' as CuidadoraStatus,
    origem: 'auto-cadastro',
    revisado: false,
    rascunho: true,
    criado_em: agora(),
  })
  const ref = await addDoc(collection(db, 'cuidadoras'), novo)
  return ref.id
}

/** Atualiza o rascunho conforme a pessoa preenche (auto-save). */
export async function atualizarRascunhoCuidadora(id: string, dados: Partial<FichaCuidadora>): Promise<void> {
  await updateDoc(doc(db, 'cuidadoras', id), limpar(camposFicha(dados)))
}

/** Marca o cadastro como enviado (deixa de ser rascunho) e grava os dados finais. */
export async function finalizarCuidadora(id: string, dados: FichaCuidadora): Promise<void> {
  await updateDoc(doc(db, 'cuidadoras', id), limpar({ ...camposFicha(dados), rascunho: false }))
}

// ---- Documentos ----------------------------------------------------------------

export async function listarDocumentos(cuidadoraId: string): Promise<DocumentoCuidadora[]> {
  const snap = await getDocs(
    query(collection(db, 'cuidadoras', cuidadoraId, 'documentos'), orderBy('criado_em', 'desc')),
  )
  return snap.docs.map((d) => comId<DocumentoCuidadora>(d.id, d.data()))
}

export async function anexarDocumento(
  cuidadoraId: string,
  arq: PreparadoParaAnexo,
): Promise<string> {
  const ref = await addDoc(collection(db, 'cuidadoras', cuidadoraId, 'documentos'), {
    nome: arq.nome,
    tipo: arq.tipo,
    tamanho: arq.tamanho,
    dataUrl: arq.dataUrl,
    criado_em: agora(),
  })
  return ref.id
}

export async function removerDocumento(cuidadoraId: string, docId: string): Promise<void> {
  await deleteDoc(doc(db, 'cuidadoras', cuidadoraId, 'documentos', docId))
}

/** Abre/baixa o documento no navegador. */
export function baixarDocumento(d: DocumentoCuidadora): void {
  const a = document.createElement('a')
  a.href = d.dataUrl
  a.download = d.nome
  a.click()
}

/** Rótulo legível do tipo da chave PIX. */
export function rotuloPixTipo(t?: string | null): string {
  switch (t) {
    case 'telefone':
      return 'Telefone'
    case 'cpf':
      return 'CPF'
    case 'email':
      return 'E-mail'
    case 'aleatoria':
      return 'Chave aleatória'
    default:
      return ''
  }
}

/**
 * Monta a mensagem de WhatsApp com TODOS os dados da cuidadora (o texto que a KA
 * envia para o RH/contador). Os documentos não vão no texto (WhatsApp por link
 * não anexa arquivo) — a KA baixa e anexa à parte.
 */
export function mensagemDadosCuidadora(c: Cuidadora): string {
  const linhas: string[] = [`*Dados — ${c.nome}*`, '']
  const add = (rot: string, val?: string | null) => {
    if (val && String(val).trim()) linhas.push(`${rot}: ${String(val).trim()}`)
  }
  const dataBR = (d?: string | null) =>
    d && d.length === 10 ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : d || ''
  add('CPF', c.cpf)
  add('RG', c.rg)
  add('PIS/NIT', c.pis)
  add('Telefone', c.telefone)
  add('E-mail', c.email)
  add('Nascimento', dataBR(c.data_nascimento))
  add('Endereço', [c.endereco, c.cidade].filter(Boolean).join(', ') || null)
  if (c.pix_chave || c.pix_banco) {
    linhas.push('', '*PIX*')
    add('Chave', c.pix_chave)
    add('Tipo', rotuloPixTipo(c.pix_tipo))
    add('Banco', c.pix_banco)
  }
  add('Observações', c.observacoes)
  return linhas.join('\n')
}

// ---- Exportar dados (TXT / planilha CSV) -------------------------------------

/** Texto simples com os dados da cuidadora (sem os *asteriscos* do WhatsApp). */
export function dadosCuidadoraTxt(c: Cuidadora): string {
  return mensagemDadosCuidadora(c).replace(/\*/g, '')
}

// Colunas da planilha (mesma ordem para uma ou várias cuidadoras).
const COLUNAS_CSV: { rot: string; val: (c: Cuidadora) => string }[] = [
  { rot: 'Nome', val: (c) => c.nome },
  { rot: 'CPF', val: (c) => c.cpf ?? '' },
  { rot: 'RG', val: (c) => c.rg ?? '' },
  { rot: 'PIS/NIT', val: (c) => c.pis ?? '' },
  { rot: 'Telefone', val: (c) => c.telefone ?? '' },
  { rot: 'E-mail', val: (c) => c.email ?? '' },
  { rot: 'Nascimento', val: (c) => c.data_nascimento ?? '' },
  { rot: 'Endereço', val: (c) => c.endereco ?? '' },
  { rot: 'Cidade/UF', val: (c) => c.cidade ?? '' },
  { rot: 'PIX - chave', val: (c) => c.pix_chave ?? '' },
  { rot: 'PIX - tipo', val: (c) => rotuloPixTipo(c.pix_tipo) },
  { rot: 'PIX - banco', val: (c) => c.pix_banco ?? '' },
  { rot: 'Status', val: (c) => c.status },
  { rot: 'Início', val: (c) => c.inicio ?? '' },
  { rot: 'Observações', val: (c) => c.observacoes ?? '' },
]

function celulaCsv(v: string): string {
  const s = String(v ?? '')
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Planilha CSV (separador ';', com BOM para o Excel abrir os acentos). */
export function cuidadorasCsv(lista: Cuidadora[]): string {
  const cab = COLUNAS_CSV.map((c) => celulaCsv(c.rot)).join(';')
  const linhas = lista.map((cui) => COLUNAS_CSV.map((c) => celulaCsv(c.val(cui))).join(';'))
  return `﻿${[cab, ...linhas].join('\r\n')}`
}

/** Baixa um texto como arquivo (.txt / .csv). */
export function baixarTextoArquivo(nomeArquivo: string, conteudo: string, mime: string): void {
  const blob = new Blob([conteudo], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Nome de arquivo seguro a partir do nome da pessoa. */
export function nomeArquivoCuidadora(nome: string): string {
  return (
    nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'cuidadora'
  )
}

// ---- Preparação de arquivo (compressão para caber no Firestore) ----------------

export interface PreparadoParaAnexo {
  nome: string
  tipo: string
  tamanho: number
  dataUrl: string
}

// Limite prático do data URL para o documento do Firestore ficar < 1 MB
// (com folga para os demais campos).
const MAX_DATAURL = 900_000

/**
 * Prepara um arquivo para anexo: imagens são redimensionadas (máx. 1600 px)
 * e comprimidas em JPEG até caberem; outros tipos (PDF etc.) entram como
 * estão, se couberem no limite — senão orienta a pessoa.
 */
export async function prepararArquivo(file: File): Promise<PreparadoParaAnexo> {
  if (file.type.startsWith('image/')) {
    const dataUrl = await comprimirImagem(file)
    if (dataUrl.length > MAX_DATAURL) {
      throw new Error(`A imagem "${file.name}" ficou grande demais mesmo comprimida. Tente uma foto com menos resolução.`)
    }
    return { nome: trocarExtensao(file.name, 'jpg'), tipo: 'image/jpeg', tamanho: file.size, dataUrl }
  }

  const dataUrl = await lerComoDataUrl(file)
  if (dataUrl.length > MAX_DATAURL) {
    throw new Error(
      `O arquivo "${file.name}" é grande demais (limite ~600 KB para PDF/documentos). ` +
        'Dica: fotografe as páginas ou use um compressor de PDF antes de enviar.',
    )
  }
  return { nome: file.name, tipo: file.type || 'application/octet-stream', tamanho: file.size, dataUrl }
}

function lerComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error(`Falha ao ler o arquivo "${file.name}".`))
    r.readAsDataURL(file)
  })
}

async function comprimirImagem(file: File): Promise<string> {
  const original = await lerComoDataUrl(file)
  const img = await carregarImagem(original)

  const MAX_LADO = 1600
  const escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * escala)
  canvas.height = Math.round(img.height * escala)
  const ctx = canvas.getContext('2d')
  if (!ctx) return original
  // Fundo branco para PNGs com transparência não ficarem pretos no JPEG.
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  // Reduz a qualidade até caber no limite.
  for (const q of [0.85, 0.75, 0.65, 0.55, 0.45]) {
    const tentativa = canvas.toDataURL('image/jpeg', q)
    if (tentativa.length <= MAX_DATAURL) return tentativa
  }
  return canvas.toDataURL('image/jpeg', 0.35)
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Falha ao processar a imagem.'))
    img.src = src
  })
}

function trocarExtensao(nome: string, ext: string): string {
  const base = nome.replace(/\.[^.]+$/, '')
  return `${base}.${ext}`
}
