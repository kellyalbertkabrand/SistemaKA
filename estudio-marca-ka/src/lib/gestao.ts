import { supabase } from './supabase'
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
// Camada de dados da GESTÃO (orçamentos, contratos, cobranças).
// Tudo passa pela RLS: admin gerencia; cliente logado só lê o que é dele.
// As páginas públicas (link por token) usam as RPCs *_por_token.
// ============================================================================

export function valorTotalOrcamento(itens: OrcamentoItem[], desconto: number): number {
  const soma = itens.reduce((t, i) => t + (Number(i.qtd) || 0) * (Number(i.valor) || 0), 0)
  return Math.max(0, soma - (Number(desconto) || 0))
}

export function formatarBRL(v: number | null | undefined): string {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatarData(d: string | null | undefined): string {
  if (!d) return '—'
  // Datas 'YYYY-MM-DD' são interpretadas como UTC; força meio-dia local.
  const data = d.length === 10 ? new Date(`${d}T12:00:00`) : new Date(d)
  return data.toLocaleDateString('pt-BR')
}

// ---- Ficha do cliente ---------------------------------------------------------

/** Campos editáveis da ficha do cliente (dados cadastrais + cobrança). */
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
  const { data, error } = await supabase
    .from('clientes')
    .update(dados)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Cliente
}

/**
 * Convida um e-mail para acessar o sistema já vinculado a um cliente.
 * Usa a Edge Function `convidar-usuario` (service_role fica só no servidor).
 */
export async function convidarUsuario(
  email: string,
  clienteId: string,
  clienteSlug: string | null,
): Promise<void> {
  const { error } = await supabase.functions.invoke('convidar-usuario', {
    body: { email, cliente_id: clienteId, cliente_slug: clienteSlug },
  })
  if (error) throw new Error(error.message)
}

// ---- Orçamentos -------------------------------------------------------------

export async function listarOrcamentos(): Promise<Orcamento[]> {
  const { data, error } = await supabase
    .from('orcamentos')
    .select('*')
    .order('criado_em', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Orcamento[]
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
  const { data, error } = await supabase
    .from('orcamentos')
    .insert(dados)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Orcamento
}

export async function atualizarOrcamento(
  id: string,
  dados: Partial<NovoOrcamento> & { status?: OrcamentoStatus; enviado_em?: string | null },
): Promise<Orcamento> {
  const { data, error } = await supabase
    .from('orcamentos')
    .update(dados)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Orcamento
}

/** Marca como enviado (libera o link público para resposta). */
export async function enviarOrcamento(id: string): Promise<Orcamento> {
  return atualizarOrcamento(id, { status: 'enviado', enviado_em: new Date().toISOString() })
}

export async function excluirOrcamento(id: string): Promise<void> {
  const { error } = await supabase.from('orcamentos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export function linkPublicoOrcamento(token: string): string {
  return `${window.location.origin}/orcamento/${token}`
}

// ---- RPCs públicas (página do prospect) --------------------------------------

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

export async function orcamentoPorToken(token: string): Promise<OrcamentoPublico | null> {
  const { data, error } = await supabase.rpc('orcamento_por_token', { p_token: token })
  if (error) throw new Error(error.message)
  const linha = Array.isArray(data) ? data[0] : data
  return (linha as OrcamentoPublico) ?? null
}

/** Aprova/recusa. Ao aprovar, devolve o token do contrato gerado. */
export async function responderOrcamento(
  token: string,
  aprovado: boolean,
  nome?: string,
  documento?: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('responder_orcamento', {
    p_token: token,
    p_aprovado: aprovado,
    p_nome: nome ?? null,
    p_documento: documento ?? null,
  })
  if (error) throw new Error(error.message)
  return (data as string) ?? null
}

// ---- Contratos ---------------------------------------------------------------

export async function listarContratos(): Promise<Contrato[]> {
  const { data, error } = await supabase
    .from('contratos')
    .select('*')
    .order('criado_em', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Contrato[]
}

export async function criarContrato(
  dados: Pick<Contrato, 'titulo' | 'conteudo'> & Partial<Pick<Contrato, 'cliente_id' | 'status'>>,
): Promise<Contrato> {
  const { data, error } = await supabase
    .from('contratos')
    .insert(dados)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Contrato
}

export async function atualizarContrato(
  id: string,
  dados: Partial<Pick<Contrato, 'titulo' | 'conteudo' | 'status' | 'enviado_em'>>,
): Promise<Contrato> {
  const { data, error } = await supabase
    .from('contratos')
    .update(dados)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Contrato
}

export async function excluirContrato(id: string): Promise<void> {
  const { error } = await supabase.from('contratos').delete().eq('id', id)
  if (error) throw new Error(error.message)
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

export async function contratoPorToken(token: string): Promise<ContratoPublico | null> {
  const { data, error } = await supabase.rpc('contrato_por_token', { p_token: token })
  if (error) throw new Error(error.message)
  const linha = Array.isArray(data) ? data[0] : data
  return (linha as ContratoPublico) ?? null
}

export async function assinarContrato(
  token: string,
  nome: string,
  documento: string,
): Promise<void> {
  const { error } = await supabase.rpc('assinar_contrato', {
    p_token: token,
    p_nome: nome,
    p_documento: documento,
    p_user_agent: navigator.userAgent,
  })
  if (error) throw new Error(error.message)
}

// ---- Modelos de contrato ------------------------------------------------------

export async function listarModelosContrato(): Promise<ModeloContrato[]> {
  const { data, error } = await supabase
    .from('modelos_contrato')
    .select('*')
    .order('padrao', { ascending: false })
    .order('criado_em', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as ModeloContrato[]
}

export async function salvarModeloContrato(
  dados: Partial<ModeloContrato> & { nome: string; conteudo: string },
): Promise<ModeloContrato> {
  const { data, error } = await supabase
    .from('modelos_contrato')
    .upsert(dados)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as ModeloContrato
}

// ---- Cobranças -----------------------------------------------------------------

export async function listarCobrancas(): Promise<Cobranca[]> {
  const { data, error } = await supabase
    .from('cobrancas')
    .select('*')
    .order('vencimento', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Cobranca[]
}

export type NovaCobranca = Pick<
  Cobranca,
  'cliente_id' | 'tipo' | 'descricao' | 'valor' | 'vencimento'
> &
  Partial<Pick<Cobranca, 'competencia' | 'link_pagamento'>>

export async function criarCobranca(dados: NovaCobranca): Promise<Cobranca> {
  const { data, error } = await supabase
    .from('cobrancas')
    .insert(dados)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Cobranca
}

export async function atualizarCobranca(
  id: string,
  dados: Partial<Pick<Cobranca, 'status' | 'link_pagamento' | 'pago_em' | 'vencimento' | 'valor'>>,
): Promise<Cobranca> {
  const { data, error } = await supabase
    .from('cobrancas')
    .update(dados)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Cobranca
}

export async function marcarCobrancaPaga(id: string): Promise<Cobranca> {
  return atualizarCobranca(id, { status: 'paga', pago_em: new Date().toISOString() })
}

/** Gera as mensalidades do mês (RPC idempotente). Devolve quantas criou. */
export async function gerarMensalidades(competencia?: string): Promise<number> {
  const { data, error } = await supabase.rpc('gerar_mensalidades', {
    p_competencia: competencia ?? null,
  })
  if (error) throw new Error(error.message)
  return (data as number) ?? 0
}

/**
 * Pede à Edge Function que crie o link de pagamento no Mercado Pago
 * (Checkout Pro: cartão, boleto e PIX) para uma cobrança.
 * Requer a function `mp-criar-cobranca` publicada e o segredo MP_ACCESS_TOKEN.
 */
export async function gerarLinkMercadoPago(cobrancaId: string): Promise<Cobranca> {
  const { data, error } = await supabase.functions.invoke('mp-criar-cobranca', {
    body: { cobranca_id: cobrancaId },
  })
  if (error) throw new Error(error.message)
  return data as Cobranca
}
