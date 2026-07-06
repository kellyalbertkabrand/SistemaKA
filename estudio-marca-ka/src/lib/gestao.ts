import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  Cliente,
  Cobranca,
  Contrato,
  ModeloContrato,
  Orcamento,
  OrcamentoItem,
  OrcamentoStatus,
} from './database.types'

// ============================================================================
// Camada de dados da GESTÃO (orçamentos, contratos, cobranças) — Firebase.
// Antes: Supabase (tabelas + RLS + RPCs + Edge Functions). Agora: Firestore,
// com a mesma interface pública. A lógica que era feita em RPC no servidor
// (responder orçamento → gerar contrato + cobrança) roda aqui no cliente.
//
// Observações sobre o plano grátis (Spark) do Firebase:
//  - Não há Cloud Functions, então o Mercado Pago (link automático) e o convite
//    por e-mail ficam manuais por enquanto (ver mensagens específicas).
//  - As páginas públicas por token leem direto do Firestore (regras liberam).
// ============================================================================

const agora = () => new Date().toISOString()

function comId<T>(id: string, data: Record<string, unknown>): T {
  return { id, ...data } as T
}

function limpar<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v
  return out as T
}

/** Token aleatório para os links públicos (orçamento/contrato). */
function novoToken(): string {
  const c = globalThis.crypto
  if (c && 'randomUUID' in c) return c.randomUUID().replace(/-/g, '')
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

export function valorTotalOrcamento(itens: OrcamentoItem[], desconto: number): number {
  const soma = itens.reduce((t, i) => t + (Number(i.qtd) || 0) * (Number(i.valor) || 0), 0)
  return Math.max(0, soma - (Number(desconto) || 0))
}

export function formatarBRL(v: number | null | undefined): string {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatarData(d: string | null | undefined): string {
  if (!d) return '—'
  const data = d.length === 10 ? new Date(`${d}T12:00:00`) : new Date(d)
  return data.toLocaleDateString('pt-BR')
}

// ---- Ficha do cliente ---------------------------------------------------------

export type FichaCliente = Partial<
  Pick<
    Cliente,
    | 'nome_marca'
    | 'slug'
    | 'instagram_handle'
    | 'segmento'
    | 'site'
    | 'status'
    | 'responsavel'
    | 'email_contato'
    | 'telefone'
    | 'endereco'
    | 'cidade'
    | 'observacoes'
    | 'email_cobranca'
    | 'documento'
    | 'valor_mensalidade'
    | 'dia_vencimento'
    | 'cobranca_ativa'
  >
>

export async function salvarFichaCliente(id: string, dados: FichaCliente): Promise<Cliente> {
  await updateDoc(doc(db, 'clientes', id), limpar({ ...dados }))
  const d = await getDoc(doc(db, 'clientes', id))
  return comId<Cliente>(d.id, d.data() ?? {})
}

/**
 * "Convida" um e-mail para acessar o sistema vinculado a um cliente.
 * No plano grátis não há envio de e-mail automático; então gravamos um convite
 * em `convites`. Quando a pessoa entrar com o Google usando esse mesmo e-mail,
 * o app vincula o login à marca automaticamente (ver AuthContext).
 */
export async function convidarUsuario(
  email: string,
  clienteId: string,
  clienteSlug: string | null,
): Promise<void> {
  const chave = email.trim().toLowerCase()
  await setDoc(doc(db, 'convites', chave), {
    email: chave,
    cliente_id: clienteId,
    cliente_slug: clienteSlug,
    criado_em: agora(),
  })
}

// ---- Orçamentos -------------------------------------------------------------

export async function listarOrcamentos(): Promise<Orcamento[]> {
  const snap = await getDocs(query(collection(db, 'orcamentos'), orderBy('criado_em', 'desc')))
  return snap.docs.map((d) => comId<Orcamento>(d.id, d.data()))
}

export type NovoOrcamento = Pick<
  Orcamento,
  | 'cliente_id'
  | 'destinatario_nome'
  | 'destinatario_email'
  | 'destinatario_documento'
  | 'titulo'
  | 'descricao'
  | 'itens'
  | 'desconto'
  | 'valor_total'
  | 'condicoes'
  | 'validade'
>

export async function criarOrcamento(dados: NovoOrcamento): Promise<Orcamento> {
  const novo = limpar({
    ...dados,
    status: 'rascunho' as OrcamentoStatus,
    token: novoToken(),
    modelo_contrato_id: null,
    contrato_id: null,
    cobranca_id: null,
    criado_em: agora(),
    enviado_em: null,
    respondido_em: null,
  })
  const ref = await addDoc(collection(db, 'orcamentos'), novo)
  return comId<Orcamento>(ref.id, novo)
}

export async function atualizarOrcamento(
  id: string,
  dados: Partial<NovoOrcamento> & { status?: OrcamentoStatus; enviado_em?: string | null },
): Promise<Orcamento> {
  await updateDoc(doc(db, 'orcamentos', id), limpar({ ...dados }))
  const d = await getDoc(doc(db, 'orcamentos', id))
  return comId<Orcamento>(d.id, d.data() ?? {})
}

export async function enviarOrcamento(id: string): Promise<Orcamento> {
  return atualizarOrcamento(id, { status: 'enviado', enviado_em: agora() })
}

export async function excluirOrcamento(id: string): Promise<void> {
  await deleteDoc(doc(db, 'orcamentos', id))
}

export function linkPublicoOrcamento(token: string): string {
  return `${window.location.origin}/orcamento/${token}`
}

// ---- Página pública do orçamento (por token) ---------------------------------

export interface OrcamentoPublico {
  titulo: string
  descricao: string | null
  destinatario_nome: string
  itens: OrcamentoItem[]
  desconto: number
  valor_total: number
  condicoes: string | null
  validade: string | null
  status: OrcamentoStatus
  criado_em: string
  respondido_em: string | null
}

async function orcamentoPorTokenDoc(token: string): Promise<Orcamento | null> {
  const snap = await getDocs(
    query(collection(db, 'orcamentos'), where('token', '==', token), limit(1)),
  )
  const d = snap.docs[0]
  return d ? comId<Orcamento>(d.id, d.data()) : null
}

export async function orcamentoPorToken(token: string): Promise<OrcamentoPublico | null> {
  const o = await orcamentoPorTokenDoc(token)
  if (!o) return null
  return {
    titulo: o.titulo,
    descricao: o.descricao,
    destinatario_nome: o.destinatario_nome,
    itens: o.itens,
    desconto: o.desconto,
    valor_total: o.valor_total,
    condicoes: o.condicoes,
    validade: o.validade,
    status: o.status,
    criado_em: o.criado_em,
    respondido_em: o.respondido_em,
  }
}

function preencherModelo(texto: string, dados: Record<string, string>): string {
  return texto.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, chave: string) => dados[chave] ?? '')
}

/**
 * Aprova/recusa um orçamento. Ao aprovar, gera o contrato (a partir do modelo
 * padrão) e uma cobrança avulsa, e devolve o token do contrato para o cliente
 * assinar. Reproduz a antiga RPC `responder_orcamento`.
 */
export async function responderOrcamento(
  token: string,
  aprovado: boolean,
  nome?: string,
  documento?: string,
): Promise<string | null> {
  const o = await orcamentoPorTokenDoc(token)
  if (!o) throw new Error('Orçamento não encontrado.')
  if (o.status === 'aprovado' || o.status === 'recusado') {
    throw new Error('Este orçamento já foi respondido.')
  }

  const quando = agora()

  if (!aprovado) {
    await updateDoc(doc(db, 'orcamentos', o.id), {
      status: 'recusado',
      respondido_em: quando,
      destinatario_nome: nome ?? o.destinatario_nome,
      destinatario_documento: documento ?? o.destinatario_documento,
    })
    return null
  }

  // Modelo de contrato padrão (ou o primeiro que houver).
  const modelos = await listarModelosContrato()
  const modelo = modelos.find((m) => m.padrao) ?? modelos[0]
  const nomeFinal = nome ?? o.destinatario_nome
  const docFinal = documento ?? o.destinatario_documento ?? ''
  const corpo = modelo
    ? preencherModelo(modelo.conteudo, {
        cliente_nome: nomeFinal,
        cliente_documento: docFinal,
        titulo: o.titulo,
        descricao: o.descricao ?? '',
        valor: formatarBRL(o.valor_total),
        valor_total: formatarBRL(o.valor_total),
        data: formatarData(quando),
      })
    : `Contrato referente a: ${o.titulo}\n\nValor: ${formatarBRL(o.valor_total)}\n` +
      `Contratante: ${nomeFinal} (${docFinal}).`

  const contratoToken = novoToken()
  const contrato = limpar({
    orcamento_id: o.id,
    cliente_id: o.cliente_id,
    titulo: `Contrato — ${o.titulo}`,
    conteudo: corpo,
    status: 'enviado',
    token: contratoToken,
    criado_em: quando,
    enviado_em: quando,
    assinado_em: null,
    assinatura_nome: null,
    assinatura_documento: null,
    assinatura_user_agent: null,
  })
  const contratoRef = await addDoc(collection(db, 'contratos'), contrato)

  // Cobrança avulsa correspondente (vencimento em 7 dias).
  const venc = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const cobranca = limpar({
    cliente_id: o.cliente_id,
    orcamento_id: o.id,
    tipo: 'avulsa',
    descricao: o.titulo,
    valor: o.valor_total,
    vencimento: venc,
    competencia: null,
    status: 'pendente',
    mp_preference_id: null,
    mp_payment_id: null,
    link_pagamento: null,
    boleto_url: null,
    boleto_linha_digitavel: null,
    pago_em: null,
    criado_em: quando,
  })
  const cobrancaRef = await addDoc(collection(db, 'cobrancas'), cobranca)

  await updateDoc(doc(db, 'orcamentos', o.id), {
    status: 'aprovado',
    respondido_em: quando,
    destinatario_nome: nomeFinal,
    destinatario_documento: docFinal,
    modelo_contrato_id: modelo?.id ?? null,
    contrato_id: contratoRef.id,
    cobranca_id: cobrancaRef.id,
  })

  return contratoToken
}

// ---- Contratos ---------------------------------------------------------------

export async function listarContratos(): Promise<Contrato[]> {
  const snap = await getDocs(query(collection(db, 'contratos'), orderBy('criado_em', 'desc')))
  return snap.docs.map((d) => comId<Contrato>(d.id, d.data()))
}

export async function criarContrato(
  dados: Pick<Contrato, 'titulo' | 'conteudo'> & Partial<Pick<Contrato, 'cliente_id' | 'status'>>,
): Promise<Contrato> {
  const novo = limpar({
    orcamento_id: null,
    cliente_id: dados.cliente_id ?? null,
    titulo: dados.titulo,
    conteudo: dados.conteudo,
    status: dados.status ?? 'rascunho',
    token: novoToken(),
    criado_em: agora(),
    enviado_em: null,
    assinado_em: null,
    assinatura_nome: null,
    assinatura_documento: null,
    assinatura_user_agent: null,
  })
  const ref = await addDoc(collection(db, 'contratos'), novo)
  return comId<Contrato>(ref.id, novo)
}

/**
 * Cria um contrato novo já a partir do MODELO padrão, preenchendo os campos do
 * cliente ({{cliente_nome}}, {{cliente_documento}}, {{data}}). Usado pelo botão
 * "Novo contrato" — sem precisar de orçamento.
 */
export async function criarContratoDoModelo(dados: {
  cliente_nome: string
  cliente_documento?: string
  cliente_id?: string | null
  titulo?: string
}): Promise<Contrato> {
  const modelos = await listarModelosContrato()
  const modelo = modelos.find((m) => m.padrao) ?? modelos[0]
  const quando = agora()
  const corpo = modelo
    ? preencherModelo(modelo.conteudo, {
        cliente_nome: dados.cliente_nome,
        cliente_documento: dados.cliente_documento ?? '',
        data: formatarData(quando),
      })
    : `Contrato para ${dados.cliente_nome}.`
  return criarContrato({
    titulo: dados.titulo ?? `Contrato — ${dados.cliente_nome}`,
    conteudo: corpo,
    cliente_id: dados.cliente_id ?? null,
    status: 'rascunho',
  })
}

export async function atualizarContrato(
  id: string,
  dados: Partial<Pick<Contrato, 'titulo' | 'conteudo' | 'status' | 'enviado_em'>>,
): Promise<Contrato> {
  await updateDoc(doc(db, 'contratos', id), limpar({ ...dados }))
  const d = await getDoc(doc(db, 'contratos', id))
  return comId<Contrato>(d.id, d.data() ?? {})
}

export async function excluirContrato(id: string): Promise<void> {
  await deleteDoc(doc(db, 'contratos', id))
}

export function linkPublicoContrato(token: string): string {
  return `${window.location.origin}/contrato/${token}`
}

export interface ContratoPublico {
  titulo: string
  conteudo: string
  status: Contrato['status']
  criado_em: string
  assinado_em: string | null
  assinatura_nome: string | null
}

async function contratoPorTokenDoc(token: string): Promise<Contrato | null> {
  const snap = await getDocs(
    query(collection(db, 'contratos'), where('token', '==', token), limit(1)),
  )
  const d = snap.docs[0]
  return d ? comId<Contrato>(d.id, d.data()) : null
}

export async function contratoPorToken(token: string): Promise<ContratoPublico | null> {
  const c = await contratoPorTokenDoc(token)
  if (!c) return null
  return {
    titulo: c.titulo,
    conteudo: c.conteudo,
    status: c.status,
    criado_em: c.criado_em,
    assinado_em: c.assinado_em,
    assinatura_nome: c.assinatura_nome,
  }
}

export async function assinarContrato(
  token: string,
  nome: string,
  documento: string,
): Promise<void> {
  const c = await contratoPorTokenDoc(token)
  if (!c) throw new Error('Contrato não encontrado.')
  if (c.status === 'assinado') throw new Error('Este contrato já foi assinado.')
  await updateDoc(doc(db, 'contratos', c.id), {
    status: 'assinado',
    assinado_em: agora(),
    assinatura_nome: nome,
    assinatura_documento: documento,
    assinatura_user_agent: navigator.userAgent,
  })
}

// ---- Modelos de contrato ------------------------------------------------------

export async function listarModelosContrato(): Promise<ModeloContrato[]> {
  const snap = await getDocs(collection(db, 'modelos_contrato'))
  return snap.docs
    .map((d) => comId<ModeloContrato>(d.id, d.data()))
    .sort((a, b) => {
      if (a.padrao !== b.padrao) return a.padrao ? -1 : 1
      return a.criado_em < b.criado_em ? -1 : 1
    })
}

export async function salvarModeloContrato(
  dados: Partial<ModeloContrato> & { nome: string; conteudo: string },
): Promise<ModeloContrato> {
  if (dados.id) {
    await updateDoc(
      doc(db, 'modelos_contrato', dados.id),
      limpar({ nome: dados.nome, conteudo: dados.conteudo, padrao: dados.padrao }),
    )
    const d = await getDoc(doc(db, 'modelos_contrato', dados.id))
    return comId<ModeloContrato>(d.id, d.data() ?? {})
  }
  const novo = limpar({
    nome: dados.nome,
    conteudo: dados.conteudo,
    padrao: dados.padrao ?? false,
    criado_em: agora(),
  })
  const ref = await addDoc(collection(db, 'modelos_contrato'), novo)
  return comId<ModeloContrato>(ref.id, novo)
}

// ---- Cobranças -----------------------------------------------------------------

export async function listarCobrancas(): Promise<Cobranca[]> {
  const snap = await getDocs(query(collection(db, 'cobrancas'), orderBy('vencimento', 'desc')))
  return snap.docs.map((d) => comId<Cobranca>(d.id, d.data()))
}

export type NovaCobranca = Pick<
  Cobranca,
  'cliente_id' | 'tipo' | 'descricao' | 'valor' | 'vencimento'
> &
  Partial<Pick<Cobranca, 'competencia' | 'link_pagamento'>>

export async function criarCobranca(dados: NovaCobranca): Promise<Cobranca> {
  const novo = limpar({
    cliente_id: dados.cliente_id ?? null,
    orcamento_id: null,
    tipo: dados.tipo,
    descricao: dados.descricao,
    valor: dados.valor,
    vencimento: dados.vencimento,
    competencia: dados.competencia ?? null,
    status: 'pendente',
    mp_preference_id: null,
    mp_payment_id: null,
    link_pagamento: dados.link_pagamento ?? null,
    boleto_url: null,
    boleto_linha_digitavel: null,
    pago_em: null,
    criado_em: agora(),
  })
  const ref = await addDoc(collection(db, 'cobrancas'), novo)
  return comId<Cobranca>(ref.id, novo)
}

export async function atualizarCobranca(
  id: string,
  dados: Partial<Pick<Cobranca, 'status' | 'link_pagamento' | 'pago_em' | 'vencimento' | 'valor'>>,
): Promise<Cobranca> {
  await updateDoc(doc(db, 'cobrancas', id), limpar({ ...dados }))
  const d = await getDoc(doc(db, 'cobrancas', id))
  return comId<Cobranca>(d.id, d.data() ?? {})
}

export async function marcarCobrancaPaga(id: string): Promise<Cobranca> {
  return atualizarCobranca(id, { status: 'paga', pago_em: agora() })
}

/**
 * Gera as mensalidades da competência (mês) — idempotente: não duplica uma
 * mensalidade já criada para o mesmo cliente/competência. Devolve quantas criou.
 * Reproduz a antiga RPC `gerar_mensalidades` no cliente.
 */
export async function gerarMensalidades(competencia?: string): Promise<number> {
  const hoje = new Date()
  const comp = competencia ?? `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  const [clientesSnap, cobrancasSnap] = await Promise.all([
    getDocs(query(collection(db, 'clientes'), where('cobranca_ativa', '==', true))),
    getDocs(query(collection(db, 'cobrancas'), where('competencia', '==', comp))),
  ])

  const jaTem = new Set(cobrancasSnap.docs.map((d) => d.data().cliente_id as string))
  let criadas = 0

  for (const c of clientesSnap.docs) {
    const cli = c.data() as Cliente
    if (!cli.valor_mensalidade || cli.valor_mensalidade <= 0) continue
    if (jaTem.has(c.id)) continue
    const dia = Math.min(28, Math.max(1, Number(cli.dia_vencimento) || 10))
    const vencimento = `${comp}-${String(dia).padStart(2, '0')}`
    await criarCobranca({
      cliente_id: c.id,
      tipo: 'mensalidade',
      descricao: `Mensalidade ${comp} — ${cli.nome_marca}`,
      valor: cli.valor_mensalidade,
      vencimento,
      competencia: comp,
    })
    criadas++
  }
  return criadas
}

/**
 * Link de pagamento do Mercado Pago: exigiria uma Cloud Function (plano Blaze),
 * pois o access token do MP não pode ir para o front. Enquanto isso, cole o
 * link manualmente na cobrança (campo "link de pagamento").
 */
export async function gerarLinkMercadoPago(_cobrancaId: string): Promise<Cobranca> {
  throw new Error(
    'O link automático do Mercado Pago precisa de uma Cloud Function (plano Blaze do Firebase). ' +
      'Por enquanto, gere o link no painel do Mercado Pago e cole no campo "link de pagamento" da cobrança.',
  )
}
