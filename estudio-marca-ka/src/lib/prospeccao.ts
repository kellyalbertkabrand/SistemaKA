// ============================================================================
// PROSPECÇÃO — empresas que a KA quer conquistar (prospecção ATIVA).
//
// Diferente da aba Leads (quem veio sozinho pelo teste do site), aqui ficam as
// empresas que a KA vai procurar: médias, que podem pagar um projeto de
// posicionamento/reposicionamento de R$ 12 mil a R$ 40 mil.
//
// DE ONDE VÊM as empresas (campo `origem`):
//  - 'noticia'  → Radar de gatilhos (robô diário do SistemaKA): notícias de
//                 fusão, sucessão, expansão, aniversário, franquia, aporte…
//  - 'vaga'     → Radar de vagas: empresa contratando gente de marketing
//                 (tem verba e está estruturando a área).
//  - 'google'   → Busca no Google Maps por segmento + cidade (aba Buscar).
//  - 'manual' / 'indicacao' / 'evento' → a KA cadastra ou importa planilha.
//
// Toda empresa pode ser QUALIFICADA pelo CNPJ (dados públicos da Receita:
// porte, capital social, Simples Nacional, idade, sócios). A nota (0–100)
// mede o quanto ela parece com o cliente ideal da KA.
//
// Coleção `prospeccao` do Firestore. Config do perfil ideal em
// `prospeccao_config/icp`.
// ============================================================================

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { moverParaLixeira } from './lixeira'

export type StatusProspect =
  | 'novo'
  | 'qualificado'
  | 'contatado'
  | 'conversa'
  | 'proposta'
  | 'cliente'
  | 'descartado'

export const STATUS_PROSPECT: { valor: StatusProspect; rotulo: string }[] = [
  { valor: 'novo', rotulo: 'Novo' },
  { valor: 'qualificado', rotulo: 'Qualificado' },
  { valor: 'contatado', rotulo: 'Contatado' },
  { valor: 'conversa', rotulo: 'Em conversa' },
  { valor: 'proposta', rotulo: 'Proposta enviada' },
  { valor: 'cliente', rotulo: 'Virou cliente' },
  { valor: 'descartado', rotulo: 'Descartado' },
]

export function rotuloStatusProspect(s?: string | null): string {
  return STATUS_PROSPECT.find((x) => x.valor === s)?.rotulo ?? 'Novo'
}

export type OrigemProspect = 'noticia' | 'vaga' | 'google' | 'manual' | 'indicacao' | 'evento'

export const ORIGENS: Record<OrigemProspect, string> = {
  noticia: 'Radar de notícias',
  vaga: 'Vaga de marketing',
  google: 'Google Maps',
  manual: 'Cadastro manual',
  indicacao: 'Indicação',
  evento: 'Evento / associação',
}

export interface DadosReceita {
  cnpj: string
  razao_social: string
  nome_fantasia?: string
  porte: string
  capital_social: number
  abertura: string
  simples: boolean | null
  mei: boolean
  cnae: string
  situacao: string
  cidade: string
  uf: string
  telefone?: string
  email?: string
  socios: { nome: string; qualificacao: string }[]
}

export interface DadosGoogle {
  place_id?: string
  rating?: number | null
  avaliacoes?: number
  maps_url?: string
  categoria?: string
  endereco?: string
}

export interface Prospect {
  id: string
  empresa: string
  segmento?: string | null
  cidade?: string | null
  uf?: string | null
  site?: string | null
  telefone?: string | null
  email?: string | null
  instagram?: string | null
  cnpj?: string | null
  origem: OrigemProspect
  /** O motivo de procurar AGORA (a notícia, a vaga, a indicação…). */
  sinal?: string | null
  sinal_url?: string | null
  sinal_data?: string | null
  gatilho?: string | null
  por_que_agora?: string | null
  decisor?: string | null
  pessoa_citada?: string | null
  msg_linkedin?: string | null
  email_assunto?: string | null
  email_corpo?: string | null
  google?: DadosGoogle | null
  receita?: DadosReceita | null
  /** Encaixe 0–10 dado pela IA do radar (quando veio de lá). */
  encaixe_ia?: number | null
  status?: StatusProspect | null
  nota?: string | null
  criado_em: string
  atualizado_em?: string | null
  excluido_em?: string | null
}

// ---- Perfil de cliente ideal (ICP) ------------------------------------------

export interface PerfilIdeal {
  ticket_min: number
  ticket_max: number
  /** Segmentos que já compraram / que a KA quer (texto livre, um por item). */
  segmentos: string[]
  /** Cidades ou UFs com bônus (atendimento presencial, rede local). */
  regioes: string[]
  /** Capital social mínimo para considerar "tem bolso". */
  capital_minimo: number
  /** Anos mínimos de empresa. */
  idade_minima: number
}

export const PERFIL_PADRAO: PerfilIdeal = {
  ticket_min: 12000,
  ticket_max: 40000,
  segmentos: [
    'odontologia', 'clínica', 'saúde', 'veterinário', 'calçados', 'moda', 'indústria',
    'arquitetura', 'construção', 'incorporadora', 'decoração', 'alimentos', 'varejo', 'franquia',
  ],
  regioes: ['RS', 'Porto Alegre', 'Cachoeirinha', 'Gravataí', 'Canoas', 'Novo Hamburgo', 'SC'],
  capital_minimo: 100000,
  idade_minima: 3,
}

const REF_ICP = () => doc(db, 'prospeccao_config', 'icp')

export async function carregarPerfil(): Promise<PerfilIdeal> {
  try {
    const s = await getDoc(REF_ICP())
    return s.exists() ? { ...PERFIL_PADRAO, ...(s.data() as Partial<PerfilIdeal>) } : PERFIL_PADRAO
  } catch {
    return PERFIL_PADRAO
  }
}

export async function salvarPerfil(p: PerfilIdeal): Promise<void> {
  await setDoc(REF_ICP(), { ...p, atualizado_em: new Date().toISOString() })
}

// ---- Nota (0–100): o quanto parece com o cliente ideal ----------------------

export interface ItemNota {
  rotulo: string
  pontos: number
}

function sem(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function anosDeEmpresa(abertura?: string | null): number | null {
  if (!abertura) return null
  const d = new Date(abertura.length === 10 ? `${abertura}T12:00:00` : abertura)
  if (isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000))
}

/** Explica a nota item a item (aparece na ficha, para a KA confiar no número). */
export function explicarNota(p: Prospect, icp: PerfilIdeal): ItemNota[] {
  const itens: ItemNota[] = []
  const r = p.receita
  if (r) {
    const porte = sem(r.porte)
    if (r.mei) itens.push({ rotulo: 'MEI (pequena demais)', pontos: -40 })
    else if (porte.includes('demais')) itens.push({ rotulo: 'Porte "Demais" (acima de pequena empresa)', pontos: 25 })
    else if (porte.includes('pequeno')) itens.push({ rotulo: 'Empresa de Pequeno Porte', pontos: 12 })
    else if (porte.includes('micro')) itens.push({ rotulo: 'Microempresa', pontos: -10 })
    if (r.simples === false && !r.mei && !porte.includes('micro'))
      itens.push({ rotulo: 'Fora do Simples (faturamento provável acima de R$ 4,8 mi/ano)', pontos: 12 })
    const cap = r.capital_social || 0
    if (cap >= 1_000_000) itens.push({ rotulo: 'Capital social de R$ 1 mi ou mais', pontos: 15 })
    else if (cap >= 300_000) itens.push({ rotulo: 'Capital social de R$ 300 mil ou mais', pontos: 10 })
    else if (cap >= icp.capital_minimo) itens.push({ rotulo: 'Capital social acima do seu mínimo', pontos: 5 })
    else if (cap > 0 && cap < 30_000) itens.push({ rotulo: 'Capital social baixo', pontos: -5 })
    const anos = anosDeEmpresa(r.abertura)
    if (anos != null) {
      if (anos >= 15) itens.push({ rotulo: `${anos} anos de empresa (tradição pede reposicionamento)`, pontos: 10 })
      else if (anos >= Math.max(icp.idade_minima, 5)) itens.push({ rotulo: `${anos} anos de empresa`, pontos: 8 })
      else if (anos < icp.idade_minima) itens.push({ rotulo: `Empresa nova (${anos} anos)`, pontos: -5 })
    }
    if ((r.socios?.length ?? 0) >= 2) itens.push({ rotulo: 'Tem 2 ou mais sócios', pontos: 3 })
    if (r.situacao && !sem(r.situacao).includes('ativa')) itens.push({ rotulo: `Situação: ${r.situacao}`, pontos: -60 })
  }
  const g = p.google
  if (g?.avaliacoes) {
    if (g.avaliacoes >= 300) itens.push({ rotulo: `${g.avaliacoes} avaliações no Google (muito movimento)`, pontos: 10 })
    else if (g.avaliacoes >= 100) itens.push({ rotulo: `${g.avaliacoes} avaliações no Google`, pontos: 6 })
    else if (g.avaliacoes >= 30) itens.push({ rotulo: `${g.avaliacoes} avaliações no Google`, pontos: 3 })
  }
  if (p.site) itens.push({ rotulo: 'Tem site próprio', pontos: 3 })
  const texto = sem(`${p.segmento ?? ''} ${p.receita?.cnae ?? ''} ${p.google?.categoria ?? ''} ${p.empresa}`)
  const seg = icp.segmentos.find((s) => s && texto.includes(sem(s)))
  if (seg) itens.push({ rotulo: `Segmento parecido com seus clientes (${seg})`, pontos: 8 })
  const local = sem(`${p.cidade ?? ''} ${p.uf ?? ''} ${p.receita?.cidade ?? ''} ${p.receita?.uf ?? ''}`)
  const reg = icp.regioes.find((x) => x && new RegExp(`\\b${sem(x)}\\b`).test(local))
  if (reg) itens.push({ rotulo: `Na sua região (${reg})`, pontos: 5 })
  if (p.origem === 'noticia') itens.push({ rotulo: 'Está num momento de virada (notícia)', pontos: 12 })
  if (p.origem === 'vaga') itens.push({ rotulo: 'Contratando gente de marketing (tem verba)', pontos: 10 })
  if (p.origem === 'indicacao') itens.push({ rotulo: 'Veio por indicação', pontos: 15 })
  if (typeof p.encaixe_ia === 'number') itens.push({ rotulo: `Encaixe avaliado pela IA: ${p.encaixe_ia}/10`, pontos: Math.round((p.encaixe_ia - 5) * 2) })
  return itens
}

export function notaProspect(p: Prospect, icp: PerfilIdeal): number {
  const base = 30
  const soma = explicarNota(p, icp).reduce((t, i) => t + i.pontos, base)
  return Math.max(0, Math.min(100, soma))
}

export function faixaNota(n: number): { rotulo: string; classe: string } {
  if (n >= 70) return { rotulo: 'Quente', classe: 'badge--verde' }
  if (n >= 50) return { rotulo: 'Morno', classe: 'badge--dourado' }
  return { rotulo: 'Frio', classe: 'badge--cinza' }
}

// ---- Banco ------------------------------------------------------------------

/** Firestore recusa `undefined`: remove antes de gravar. */
function limpo<T extends Record<string, unknown>>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T
}

export function chaveEmpresa(p: Pick<Prospect, 'empresa' | 'cnpj' | 'cidade'>): string {
  const cnpj = (p.cnpj ?? '').replace(/\D/g, '')
  if (cnpj.length === 14) return 'c:' + cnpj
  const nome = sem(p.empresa)
    .replace(/\b(ltda|s\/?a|eireli|me|epp|grupo)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  return 'n:' + nome + '|' + sem(p.cidade).trim()
}

export async function listarProspects(): Promise<Prospect[]> {
  const snap = await getDocs(collection(db, 'prospeccao'))
  return snap.docs
    .filter((d) => !d.data().excluido_em)
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Prospect, 'id'>) }))
    .sort((a, b) => ((b.criado_em || '') > (a.criado_em || '') ? 1 : -1))
}

export async function criarProspect(dados: Omit<Prospect, 'id' | 'criado_em'>): Promise<string> {
  const agora = new Date().toISOString()
  const ref = await addDoc(
    collection(db, 'prospeccao'),
    limpo({ status: 'novo', ...dados, criado_em: agora, atualizado_em: agora }),
  )
  return ref.id
}

export async function atualizarProspect(id: string, dados: Partial<Omit<Prospect, 'id'>>): Promise<void> {
  await updateDoc(doc(db, 'prospeccao', id), limpo({ ...dados, atualizado_em: new Date().toISOString() }))
}

export async function excluirProspect(id: string): Promise<void> {
  await moverParaLixeira('prospeccao', id)
}

// ---- Função de servidor (CNPJ + Google Maps) --------------------------------

async function chamarFuncao<T>(corpo: Record<string, unknown>): Promise<T> {
  const r = await fetch('/.netlify/functions/prospeccao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
  const j = await r.json().catch(() => ({ erro: `A função respondeu ${r.status}.` }))
  if (j.erro) throw new Error(j.erro)
  return j as T
}

export async function consultarCnpj(cnpj: string): Promise<DadosReceita> {
  const { receita } = await chamarFuncao<{ receita: DadosReceita }>({ acao: 'cnpj', cnpj })
  return receita
}

export interface ResultadoGoogle {
  place_id: string
  empresa: string
  endereco: string
  cidade: string
  uf: string
  site: string
  telefone: string
  rating: number | null
  avaliacoes: number
  maps_url: string
  categoria: string
}

export async function buscarNoGoogle(
  termo: string,
  cidade: string,
  pagina?: string | null,
): Promise<{ empresas: ResultadoGoogle[]; proxima: string | null }> {
  return chamarFuncao({ acao: 'buscar', termo, cidade, pagina: pagina ?? undefined })
}

// ---- Links e mensagens --------------------------------------------------------

export function linkLinkedin(p: Prospect): string {
  const q = `${p.empresa} fundador OR sócio OR CEO OR marketing`
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(q)}`
}

export function linkCnpj(p: Prospect): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`CNPJ ${p.empresa} ${p.cidade ?? ''}`)}`
}

export function linkInstagram(p: Prospect): string {
  if (p.instagram) return `https://instagram.com/${p.instagram.replace(/^@/, '')}`
  return `https://www.google.com/search?q=${encodeURIComponent(`${p.empresa} ${p.cidade ?? ''} instagram`)}`
}

/** 1ª mensagem (WhatsApp/Direct) no tom da Kelly: começa pelo fato, frases
 *  curtas, sem clichê, sem pedir para comprar. O pedido é uma conversa curta. */
export function mensagemAbordagem(p: Prospect): string {
  if (p.msg_linkedin && p.origem === 'noticia') return p.msg_linkedin
  const nome = p.empresa
  const abre: Record<OrigemProspect, string> = {
    noticia: `Oi! Aqui é a Kelly Albert. Vi a notícia sobre a ${nome}${p.sinal ? ` (${p.sinal.replace(/\s+-\s+[^-]+$/, '')})` : ''}. Parabéns pelo momento.`,
    vaga: `Oi! Aqui é a Kelly Albert. Vi que a ${nome} está estruturando o time de marketing. Sinal de que a empresa está crescendo, né?`,
    google: `Oi! Aqui é a Kelly Albert. Conheci a ${nome} pelo Google e fiquei olhando a marca com atenção.`,
    manual: `Oi! Aqui é a Kelly Albert, estrategista de posicionamento de marca.`,
    indicacao: `Oi! Aqui é a Kelly Albert. Recebi uma indicação para falar com a ${nome}.`,
    evento: `Oi! Aqui é a Kelly Albert. A gente se cruzou no evento e eu fiquei com a ${nome} na cabeça.`,
  }
  return [
    abre[p.origem] ?? abre.manual,
    'Eu trabalho com posicionamento e reposicionamento de marca. Ajudo empresas que entregam muito a serem percebidas pelo valor que têm.',
    'Posso te mandar uma leitura rápida, sem custo, de como a marca da ' + nome + ' está sendo percebida hoje? São 15 minutos de conversa.',
  ].join('\n\n')
}

export function assuntoEmail(p: Prospect): string {
  return p.email_assunto || `${p.empresa}: o que a marca entrega e o que o mercado enxerga`
}

export function corpoEmail(p: Prospect): string {
  if (p.email_corpo) return p.email_corpo
  return [
    'Olá!',
    mensagemAbordagem(p).replace(/^Oi! Aqui é a Kelly Albert\.?\s*/, ''),
    'Kelly Albert · KA | Inteligência para Marcas\nkellyalbert.com.br',
  ].join('\n\n')
}

// ---- Perfil dos clientes que já compraram (calibra o ICP) -------------------

export interface ClienteHistorico {
  id: string
  nome: string
  segmento: string | null
  cidade: string | null
  documento: string | null
  valor_projetos: number
  qtd_projetos: number
}
