import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'

// ============================================================================
// PROJETOS — gestão simples do andamento de cada trabalho.
//
// Um projeto tem uma lista de FASES embutida no próprio documento (simples de
// alimentar: um clique avança a fase). O cliente acompanha pelo link público
// /projeto/:token — a página usa onSnapshot do Firestore, então atualiza EM
// TEMPO REAL assim que a KA marca uma fase.
// ============================================================================

export type FaseStatus = 'pendente' | 'andamento' | 'concluida'
export type ProjetoStatus = 'ativo' | 'pausado' | 'concluido'

export interface FaseProjeto {
  nome: string
  /** Descrição curta da etapa (o cliente vê abaixo do nome). */
  descricao?: string | null
  status: FaseStatus
  /** Data em que foi concluída (ISO), para mostrar ao cliente. */
  concluida_em: string | null
}

export interface Projeto {
  id: string
  nome: string
  cliente_id: string | null
  /** Nome exibido na página pública (denormalizado, sem depender de login). */
  cliente_nome: string | null
  descricao: string | null
  fases: FaseProjeto[]
  status: ProjetoStatus
  token: string
  criado_em: string
  atualizado_em: string
}

// ---- Modelos de fases padrão (é só escolher ao criar o projeto) --------------

export interface ModeloFaseItem {
  nome: string
  descricao?: string
}

export interface ModeloFases {
  id: string
  nome: string
  fases: ModeloFaseItem[]
}

const so = (nomes: string[]): ModeloFaseItem[] => nomes.map((nome) => ({ nome }))

export const MODELOS_FASES: ModeloFases[] = [
  {
    id: 'marca-essencia',
    nome: 'Marca com Essência©',
    fases: [
      { nome: 'Revelação de Essência', descricao: 'IKIGAI Empresarial + Escuta Estratégica com os fundadores.' },
      { nome: 'Base Estratégica + Identidade Verbal', descricao: 'Toda a inteligência da marca em um documento estratégico.' },
      { nome: 'Identidade Visual', descricao: 'Tradução da essência em expressão estética. Parceria VM Rocks Design (Gabi Lucato).' },
      { nome: 'Personalização Instagram e WhatsApp', descricao: 'Canais de contato alinhados à identidade da marca. Parceria VM Rocks Design (Gabi Lucato).' },
      { nome: 'Linha de Produtos e Serviços', descricao: 'Reorganização estratégica da oferta, nomeação e proposta de valor.' },
      { nome: 'Plano de Comunicação + Agente de IA', descricao: 'Pilares, calendário editorial e 01 agente de inteligência artificial personalizado no ChatGPT, treinado com a essência da sua marca.' },
    ],
  },
  {
    id: 'identidade',
    nome: 'Identidade visual',
    fases: so([
      'Briefing e imersão',
      'Pesquisa e direção criativa',
      'Criação do conceito',
      'Apresentação da proposta',
      'Rodada de ajustes',
      'Entrega final + manual da marca',
    ]),
  },
  {
    id: 'social',
    nome: 'Social media / templates',
    fases: so([
      'Briefing',
      'Direção visual dos posts',
      'Criação dos layouts',
      'Validação com o cliente',
      'Templates no sistema',
      'Entrega e treinamento',
    ]),
  },
  {
    id: 'site',
    nome: 'Site / landing page',
    fases: so([
      'Briefing e conteúdo',
      'Estrutura das páginas',
      'Design',
      'Desenvolvimento',
      'Revisão do cliente',
      'Publicação',
    ]),
  },
  {
    id: 'personalizado',
    nome: 'Personalizado (começa vazio)',
    fases: [],
  },
]

const agora = () => new Date().toISOString()

function comId<T>(id: string, data: Record<string, unknown>): T {
  return { id, ...data } as T
}

function novoToken(): string {
  const c = globalThis.crypto
  if (c && 'randomUUID' in c) return c.randomUUID().replace(/-/g, '')
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

/** % de fases concluídas (0–100). */
export function progressoProjeto(p: Pick<Projeto, 'fases'>): number {
  if (!p.fases.length) return 0
  const feitas = p.fases.filter((f) => f.status === 'concluida').length
  return Math.round((feitas / p.fases.length) * 100)
}

// ---- CRUD --------------------------------------------------------------------

export async function listarProjetos(): Promise<Projeto[]> {
  const snap = await getDocs(query(collection(db, 'projetos'), orderBy('criado_em', 'desc')))
  return snap.docs.map((d) => comId<Projeto>(d.id, d.data()))
}

export async function criarProjeto(dados: {
  nome: string
  cliente_id: string | null
  cliente_nome: string | null
  descricao: string | null
  fases: ModeloFaseItem[]
}): Promise<Projeto> {
  const novo = {
    nome: dados.nome,
    cliente_id: dados.cliente_id,
    cliente_nome: dados.cliente_nome,
    descricao: dados.descricao,
    fases: dados.fases.map<FaseProjeto>((fase) => ({
      nome: fase.nome,
      descricao: fase.descricao ?? null,
      status: 'pendente',
      concluida_em: null,
    })),
    status: 'ativo' as ProjetoStatus,
    token: novoToken(),
    criado_em: agora(),
    atualizado_em: agora(),
  }
  const ref = await addDoc(collection(db, 'projetos'), novo)
  return comId<Projeto>(ref.id, novo)
}

export async function salvarProjeto(
  id: string,
  dados: Partial<Pick<Projeto, 'nome' | 'cliente_nome' | 'descricao' | 'fases' | 'status'>>,
): Promise<Projeto> {
  await updateDoc(doc(db, 'projetos', id), { ...dados, atualizado_em: agora() })
  const d = await getDoc(doc(db, 'projetos', id))
  return comId<Projeto>(d.id, d.data() ?? {})
}

export async function excluirProjeto(id: string): Promise<void> {
  await deleteDoc(doc(db, 'projetos', id))
}

export function linkPublicoProjeto(token: string): string {
  return `${window.location.origin}/projeto/${token}`
}

// ---- Biblioteca de fases (reuso) ---------------------------------------------
// Toda fase que a KA escreve fica salva aqui para reaproveitar em outros
// projetos (coleção `fases_biblioteca`, id = slug do nome).

export interface FaseSalva {
  id: string
  nome: string
  descricao: string | null
  criado_em: string
}

function slug(texto: string): string {
  return (
    texto
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || novoToken()
  )
}

export async function listarFasesSalvas(): Promise<FaseSalva[]> {
  const snap = await getDocs(query(collection(db, 'fases_biblioteca'), orderBy('nome')))
  return snap.docs.map((d) => comId<FaseSalva>(d.id, d.data()))
}

/** Salva (ou atualiza) uma fase na biblioteca, para reusar depois. */
export async function salvarFaseSalva(nome: string, descricao?: string | null): Promise<void> {
  const n = nome.trim()
  if (!n) return
  await setDoc(
    doc(db, 'fases_biblioteca', slug(n)),
    { nome: n, descricao: descricao?.trim() || null, criado_em: agora() },
    { merge: true },
  )
}

export async function excluirFaseSalva(id: string): Promise<void> {
  await deleteDoc(doc(db, 'fases_biblioteca', id))
}

/** Próximo status ao clicar na fase: pendente → andamento → concluída → pendente. */
export function proximoStatusFase(s: FaseStatus): FaseStatus {
  if (s === 'pendente') return 'andamento'
  if (s === 'andamento') return 'concluida'
  return 'pendente'
}

// ---- Página pública (tempo real) ----------------------------------------------

export interface ProjetoPublico {
  nome: string
  cliente_nome: string | null
  descricao: string | null
  fases: FaseProjeto[]
  status: ProjetoStatus
  atualizado_em: string
}

/**
 * Assina o projeto pelo token: o callback roda a cada mudança (tempo real).
 * Devolve a função para cancelar a assinatura (usar no cleanup do useEffect).
 */
export function assinarProjetoPorToken(
  token: string,
  aoMudar: (p: ProjetoPublico | null) => void,
  aoErrar: (e: Error) => void,
): () => void {
  const q = query(collection(db, 'projetos'), where('token', '==', token), limit(1))
  return onSnapshot(
    q,
    (snap) => {
      const d = snap.docs[0]
      aoMudar(d ? (d.data() as ProjetoPublico) : null)
    },
    (e) => aoErrar(e instanceof Error ? e : new Error(String(e))),
  )
}
