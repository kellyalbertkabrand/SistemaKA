// Tipos do modelo de dados (seção 3 da planta). Espelham `supabase/schema.sql`.
// Mantenha em sincronia com o SQL — ou gere com `supabase gen types typescript`.

export type ClienteStatus = 'ativo' | 'pausado'
export type MarcaMood = 'claro' | 'escuro' | 'neutro'
export type EstiloBase = 'minimalista' | 'editorial' | 'expressivo'
export type GrafismoTipo = 'textura' | 'padrao' | 'ornamento'
export type FormatoPeca = 'card' | 'post' | 'carrossel' | 'reels' | 'story'
export type UsuarioPapel = 'admin' | 'cliente'

export interface Cliente {
  id: string
  nome_marca: string
  instagram_handle: string | null
  segmento: string | null
  site: string | null
  status: ClienteStatus
  criado_em: string
  /** Marca (slug dos templates) associada a este cliente. */
  slug: string | null
  // Ficha do cliente (dados cadastrais/contato)
  responsavel: string | null
  email_contato: string | null
  telefone: string | null
  endereco: string | null
  cidade: string | null
  observacoes: string | null
  // Cobrança
  email_cobranca: string | null
  documento: string | null
  valor_mensalidade: number | null
  dia_vencimento: number
  cobranca_ativa: boolean
  /** Origem do registro: 'auto-cadastro' quando veio do link público /cadastro. */
  origem?: string | null
  /** false enquanto a KA ainda não abriu a ficha de um cadastro novo. */
  revisado?: boolean
}

// ---- Gestão: orçamentos, contratos e cobranças -----------------------------

export type OrcamentoStatus = 'rascunho' | 'enviado' | 'aprovado' | 'recusado' | 'expirado'
export type ContratoStatus = 'rascunho' | 'enviado' | 'assinado' | 'cancelado'
export type CobrancaTipo = 'mensalidade' | 'avulsa'
export type CobrancaStatus = 'pendente' | 'paga' | 'atrasada' | 'cancelada'

export interface OrcamentoItem {
  descricao: string
  qtd: number
  valor: number
}

export interface Orcamento {
  id: string
  cliente_id: string | null
  destinatario_nome: string
  destinatario_email: string | null
  destinatario_documento: string | null
  titulo: string
  descricao: string | null
  itens: OrcamentoItem[]
  desconto: number
  valor_total: number
  condicoes: string | null
  validade: string | null
  status: OrcamentoStatus
  token: string
  modelo_contrato_id: string | null
  contrato_id: string | null
  cobranca_id: string | null
  criado_em: string
  enviado_em: string | null
  respondido_em: string | null
}

export interface Contrato {
  id: string
  orcamento_id: string | null
  cliente_id: string | null
  titulo: string
  conteudo: string
  status: ContratoStatus
  token: string
  criado_em: string
  enviado_em: string | null
  assinado_em: string | null
  assinatura_nome: string | null
  assinatura_documento: string | null
  assinatura_user_agent: string | null
}

export interface Cobranca {
  id: string
  cliente_id: string | null
  orcamento_id: string | null
  tipo: CobrancaTipo
  descricao: string
  valor: number
  vencimento: string
  competencia: string | null
  status: CobrancaStatus
  mp_preference_id: string | null
  mp_payment_id: string | null
  link_pagamento: string | null
  boleto_url: string | null
  boleto_linha_digitavel: string | null
  pago_em: string | null
  criado_em: string
}

export interface ModeloContrato {
  id: string
  nome: string
  conteudo: string
  padrao: boolean
  criado_em: string
}

export interface KitMarca {
  cliente_id: string
  cor_primaria: string | null
  cor_secundaria: string | null
  cor_destaque: string | null
  cor_fundo_claro: string | null
  cor_texto_escuro: string | null
  fonte_titulo_nome: string | null
  fonte_titulo_arquivo_url: string | null
  fonte_corpo_nome: string | null
  fonte_corpo_arquivo_url: string | null
  logo_principal_url: string | null
  logo_simbolo_url: string | null
  logo_negativo_url: string | null
  mood: MarcaMood | null
  usa_foto: boolean
  estilo: EstiloBase | null
  tom_de_voz: string | null
  bordoes: string[]
  cta_padrao: string | null
  assinatura: string | null
  formatos: FormatoPeca[]
  atualizado_em: string
}

export interface Grafismo {
  id: string
  cliente_id: string
  arquivo_url: string
  tipo: GrafismoTipo
  criado_em: string
}

export interface Template {
  id: string
  cliente_id: string
  nome: string
  formato: FormatoPeca
  config_json: Record<string, unknown>
  criado_em: string
}

export interface PecaGerada {
  id: string
  cliente_id: string
  formato: FormatoPeca
  conteudo_json: Record<string, unknown>
  imagem_url: string | null
  criado_em: string
}

export interface Usuario {
  id: string
  email: string
  papel: UsuarioPapel
  cliente_id: string | null
  /** Marca (slug do template) que este login de cliente enxerga. */
  cliente_slug: string | null
  criado_em: string
}
