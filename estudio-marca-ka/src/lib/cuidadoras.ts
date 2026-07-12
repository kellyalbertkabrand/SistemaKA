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
  telefone: string | null
  email: string | null
  data_nascimento: string | null // AAAA-MM-DD
  endereco: string | null
  cidade: string | null
  /** Data de início do trabalho. */
  inicio: string | null // AAAA-MM-DD
  status: CuidadoraStatus
  observacoes: string | null
  /** 'auto-cadastro' quando veio do link público /cadastro-cuidadora. */
  origem: string | null
  /** false enquanto a KA ainda não abriu a ficha de um cadastro novo. */
  revisado: boolean
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
    telefone: dados.telefone ?? null,
    email: dados.email ?? null,
    data_nascimento: dados.data_nascimento ?? null,
    endereco: dados.endereco ?? null,
    cidade: dados.cidade ?? null,
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

/** Cadastro feito pela própria cuidadora pelo link público. */
export async function cadastrarCuidadoraPublico(
  dados: FichaCuidadora,
  arquivos: PreparadoParaAnexo[] = [],
): Promise<void> {
  const novo = limpar({
    nome: dados.nome,
    cpf: dados.cpf ?? null,
    rg: dados.rg ?? null,
    telefone: dados.telefone ?? null,
    email: dados.email ?? null,
    data_nascimento: dados.data_nascimento ?? null,
    endereco: dados.endereco ?? null,
    cidade: dados.cidade ?? null,
    inicio: null,
    status: 'pendente' as CuidadoraStatus,
    observacoes: dados.observacoes ?? null,
    origem: 'auto-cadastro',
    revisado: false,
    criado_em: agora(),
  })
  const ref = await addDoc(collection(db, 'cuidadoras'), novo)
  for (const arq of arquivos) {
    await addDoc(collection(db, 'cuidadoras', ref.id, 'documentos'), {
      nome: arq.nome,
      tipo: arq.tipo,
      tamanho: arq.tamanho,
      dataUrl: arq.dataUrl,
      criado_em: agora(),
    })
  }
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
): Promise<void> {
  await addDoc(collection(db, 'cuidadoras', cuidadoraId, 'documentos'), {
    nome: arq.nome,
    tipo: arq.tipo,
    tamanho: arq.tamanho,
    dataUrl: arq.dataUrl,
    criado_em: agora(),
  })
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
