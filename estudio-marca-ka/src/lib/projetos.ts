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
import { moverParaLixeira } from './lixeira'

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

/**
 * ESTÁGIO do projeto = a coluna do quadro (onde ele está no fluxo da KA).
 * É diferente da FASE (a etapa interna do método, ex.: "Base Estratégica").
 *   fila      → fechado, ainda não começou (aqui a ordem diz quem entra antes)
 *   andamento → KA/VM trabalhando
 *   cliente   → parado esperando material, resposta ou aprovação do cliente
 *   revisao   → ajustes finais
 *   entregue  → fechado, sai da frente
 */
export type EstagioProjeto = 'fila' | 'andamento' | 'cliente' | 'revisao' | 'entregue'

export const ESTAGIOS: EstagioProjeto[] = ['fila', 'andamento', 'cliente', 'revisao', 'entregue']

export const ROTULO_ESTAGIO: Record<EstagioProjeto, string> = {
  fila: 'Na fila',
  andamento: 'Em andamento',
  cliente: 'Com o cliente',
  revisao: 'Em revisão',
  entregue: 'Entregue',
}

/**
 * Quem é responsável pela etapa. Valores especiais: 'KA' (a Kelly), 'VM'
 * (a parceira VM Rocks) e 'CLIENTE' (o próprio cliente do projeto — tarefa que
 * ELE precisa fazer, para a KA cobrar). Usados nos filtros de pendências.
 * Também pode ser qualquer texto livre que a KA escrever.
 */
export type Responsavel = string

/** Texto que aparece na tela para um responsável ('VM' vira "VM Rocks"). */
export function rotuloResp(v?: string): string {
  if (!v || v === 'KA') return 'KA'
  if (v === 'VM') return 'VM Rocks'
  if (v === 'CLIENTE') return 'Cliente'
  return v
}

/** Classe CSS da etiqueta (KA/VM/Cliente têm cor própria; o resto usa "outro"). */
export function respClasse(v?: string): 'KA' | 'VM' | 'CLIENTE' | 'outro' {
  if (!v || v === 'KA') return 'KA'
  if (v === 'VM') return 'VM'
  if (v === 'CLIENTE') return 'CLIENTE'
  return 'outro'
}

/**
 * Responsável padrão de uma etapa pelo nome: a parte visual e o Instagram
 * ficam com a VM Rocks; o resto com a KA. (Sempre dá para trocar depois.)
 */
export function responsavelPadrao(nome: string): Responsavel {
  return /visual|instagram/i.test(nome) ? 'VM' : 'KA'
}

export interface FaseProjeto {
  nome: string
  /** Descrição curta da etapa (o cliente vê abaixo do nome). */
  descricao?: string | null
  status: FaseStatus
  /** Data em que foi concluída (ISO), para mostrar ao cliente. */
  concluida_em: string | null
  /** Responsável pela etapa (KA ou VM Rocks). Ausente = KA (retrocompat). */
  responsavel?: Responsavel
  /** Data prevista/marcada da etapa (YYYY-MM-DD). Pode ficar vazia. */
  data?: string | null
}

export interface Projeto {
  id: string
  nome: string
  cliente_id: string | null
  /** Nome exibido na página pública (denormalizado, sem depender de login). */
  cliente_nome: string | null
  descricao: string | null
  /** Data de início do projeto (YYYY-MM-DD). Opcional. */
  inicio?: string | null
  /** Entrega prevista do projeto inteiro (YYYY-MM-DD). Opcional. */
  entrega_prevista?: string | null
  fases: FaseProjeto[]
  status: ProjetoStatus
  /** Coluna do quadro. Ausente em projetos antigos → ver `estagioDoProjeto`. */
  estagio?: EstagioProjeto | null
  /** Posição dentro da coluna (arrastar). Menor = mais em cima. */
  ordem?: number | null
  token: string
  criado_em: string
  atualizado_em: string
}

// ---- Modelos de fases padrão (é só escolher ao criar o projeto) --------------

export interface ModeloFaseItem {
  nome: string
  descricao?: string
  responsavel?: Responsavel
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
      { nome: 'Identidade Visual', descricao: 'Tradução da essência em expressão estética. Parceria VM Rocks Design (Gabi Lucato).', responsavel: 'VM' },
      { nome: 'Personalização Instagram e WhatsApp', descricao: 'Canais de contato alinhados à identidade da marca. Parceria VM Rocks Design (Gabi Lucato).', responsavel: 'VM' },
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

/**
 * Coluna do projeto. Projeto antigo (sem `estagio`) é encaixado pelo que já se
 * sabe: concluído → Entregue; pausado ou nada começado → Na fila; o resto →
 * Em andamento. Assim o quadro nasce preenchido, sem precisar arrumar à mão.
 */
export function estagioDoProjeto(p: Projeto): EstagioProjeto {
  if (p.estagio) return p.estagio
  if (p.status === 'concluido') return 'entregue'
  const comecou = p.fases.some((f) => f.status !== 'pendente')
  if (p.status === 'pausado' || !comecou) return 'fila'
  return 'andamento'
}

/** A fase ATUAL: a primeira etapa que ainda não foi concluída. */
export function faseAtual(p: Projeto): { fase: FaseProjeto; idx: number } | null {
  const idx = p.fases.findIndex((f) => f.status !== 'concluida')
  return idx < 0 ? null : { fase: p.fases[idx], idx }
}

/** Dias até a entrega prevista (negativo = atrasado). null = sem data. */
export function diasParaEntrega(p: Projeto, hoje = new Date()): number | null {
  if (!p.entrega_prevista) return null
  const alvo = new Date(`${p.entrega_prevista}T12:00:00`)
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12)
  return Math.round((alvo.getTime() - base.getTime()) / 86400000)
}

/** % de fases concluídas (0–100). */
export function progressoProjeto(p: Pick<Projeto, 'fases'>): number {
  if (!p.fases.length) return 0
  const feitas = p.fases.filter((f) => f.status === 'concluida').length
  return Math.round((feitas / p.fases.length) * 100)
}

// ---- Pendências (visão geral de tudo que falta) -----------------------------

/** Uma etapa em aberto (pendente ou em andamento) de algum projeto. */
export interface Pendencia {
  projeto_id: string
  projeto_nome: string
  cliente_nome: string | null
  fase_idx: number
  fase_nome: string
  fase_desc: string | null
  status: FaseStatus
  responsavel: Responsavel
  data: string | null
}

/**
 * Junta as etapas em aberto de todos os projetos (ignora projetos concluídos e
 * etapas já concluídas). `filtro` limita por responsável (KA ou VM).
 * Ordena: em andamento primeiro, depois por data (com data antes de sem data).
 */
export function pendenciasDeProjetos(
  projetos: Projeto[],
  filtro: Responsavel | 'todas' = 'todas',
): Pendencia[] {
  const out: Pendencia[] = []
  for (const p of projetos) {
    if (p.status === 'concluido') continue
    p.fases.forEach((f, i) => {
      if (f.status === 'concluida') return
      const responsavel = f.responsavel ?? 'KA'
      if (filtro !== 'todas' && responsavel !== filtro) return
      out.push({
        projeto_id: p.id,
        projeto_nome: p.nome,
        cliente_nome: p.cliente_nome,
        fase_idx: i,
        fase_nome: f.nome,
        fase_desc: f.descricao ?? null,
        status: f.status,
        responsavel,
        data: f.data ?? null,
      })
    })
  }
  return out.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'andamento' ? -1 : 1
    if (a.data && b.data) return a.data.localeCompare(b.data)
    if (a.data) return -1
    if (b.data) return 1
    return 0
  })
}

// ---- CRUD --------------------------------------------------------------------

export async function listarProjetos(): Promise<Projeto[]> {
  const snap = await getDocs(query(collection(db, 'projetos'), orderBy('criado_em', 'desc')))
  return snap.docs.filter((d) => !d.data().excluido_em).map((d) => comId<Projeto>(d.id, d.data()))
}

export async function criarProjeto(dados: {
  nome: string
  cliente_id: string | null
  cliente_nome: string | null
  descricao: string | null
  inicio?: string | null
  entrega_prevista?: string | null
  /** Posição na fila (fim da lista). */
  ordem?: number
  fases: ModeloFaseItem[]
}): Promise<Projeto> {
  const novo = {
    nome: dados.nome,
    cliente_id: dados.cliente_id,
    cliente_nome: dados.cliente_nome,
    descricao: dados.descricao,
    inicio: dados.inicio ?? null,
    entrega_prevista: dados.entrega_prevista ?? null,
    // Projeto novo entra NA FILA (decisão da KA) — a ordem manda quem começa.
    estagio: 'fila' as EstagioProjeto,
    ordem: dados.ordem ?? 0,
    fases: dados.fases.map<FaseProjeto>((fase) => ({
      nome: fase.nome,
      descricao: fase.descricao ?? null,
      status: 'pendente',
      concluida_em: null,
      responsavel: fase.responsavel ?? responsavelPadrao(fase.nome),
      data: null,
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
  dados: Partial<
    Pick<
      Projeto,
      | 'nome'
      | 'cliente_nome'
      | 'descricao'
      | 'inicio'
      | 'entrega_prevista'
      | 'fases'
      | 'status'
      | 'estagio'
      | 'ordem'
    >
  >,
): Promise<Projeto> {
  await updateDoc(doc(db, 'projetos', id), { ...dados, atualizado_em: agora() })
  const d = await getDoc(doc(db, 'projetos', id))
  return comId<Projeto>(d.id, d.data() ?? {})
}

/**
 * Move o projeto de coluna (e grava a posição). O `status` antigo continua
 * coerente: Entregue = concluído (some das pendências), o resto = ativo.
 */
export async function moverProjeto(
  id: string,
  estagio: EstagioProjeto,
  ordem: number,
): Promise<Projeto> {
  return salvarProjeto(id, {
    estagio,
    ordem,
    status: estagio === 'entregue' ? 'concluido' : 'ativo',
  })
}

/** Grava a posição de vários projetos de uma vez (depois de arrastar). */
export async function definirOrdensProjetos(
  pares: { id: string; ordem: number }[],
): Promise<void> {
  await Promise.all(
    pares.map((x) => updateDoc(doc(db, 'projetos', x.id), { ordem: x.ordem })),
  )
}

export async function excluirProjeto(id: string): Promise<void> {
  await moverParaLixeira('projetos', id)
}

function slugMarca(rotulo: string): string {
  return (
    rotulo
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40)
  )
}

/**
 * Link de acompanhamento do cliente, com a URL personalizada pelo nome da marca
 * (ex.: `/projeto/boba-joy-<token>`). O token (32 hex, sem hífen) fica NO FIM e
 * é o que identifica o projeto; o slug antes dele é só cosmético. Links antigos
 * (só o token) continuam funcionando.
 */
export function linkPublicoProjeto(token: string, rotulo?: string | null): string {
  const slug = rotulo ? slugMarca(rotulo) : ''
  const cauda = slug ? `${slug}-${token}` : token
  return `${window.location.origin}/projeto/${cauda}`
}

/** Do parâmetro da URL ("slug-<token>" ou só o token), devolve o token. */
export function tokenDoParametro(param: string): string {
  const i = param.lastIndexOf('-')
  return i >= 0 ? param.slice(i + 1) : param
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
  inicio?: string | null
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
