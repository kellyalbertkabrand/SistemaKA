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
  // Acesso ao estúdio por período (cliente pontual, ex.: Lucas)
  /** Estúdio liberado? undefined/true = liberado; false = bloqueado. */
  estudio_ativo?: boolean | null
  /** Acesso ao estúdio até esta data (YYYY-MM-DD). Vazio = sem validade. */
  estudio_ate?: string | null
  // Dados para o CONTRATO (preenchidos no cadastro ou pela KA)
  /** Razão social / nome jurídico da empresa (se diferente da marca). */
  razao_social?: string | null
  /** Fundador(a) da empresa. */
  fundador_nome?: string | null
  fundador_cpf?: string | null
  /** Quem assina o contrato (responsável legal). */
  contrato_nome?: string | null
  contrato_documento?: string | null
  contrato_rg?: string | null
  contrato_email?: string | null
  /** Origem do registro: 'auto-cadastro' quando veio do link público /cadastro. */
  origem?: string | null
  /** false enquanto a KA ainda não abriu a ficha de um cadastro novo. */
  revisado?: boolean
  /** Pagamentos do contrato: para cada um, QUEM deve ser pago (cliente, KA, VM
   *  ou um nome personalizado), quando, em quantas parcelas e o valor de cada. */
  pagamentos_contrato?: PagamentoContrato[]
  /** Sócios da empresa (quando houver mais de um). Os marcados `assina` entram
   *  como signatários do contrato, além do responsável principal. */
  socios?: Socio[]
}

/** Um sócio da empresa do cliente. `assina` = vai assinar o contrato. */
export interface Socio {
  nome: string
  cpf?: string | null
  rg?: string | null
  email?: string | null
  assina?: boolean
}

/** Um pagamento do contrato. `quem` é 'cliente' | 'ka' | 'vm' | 'outro'; quando
 *  'outro', o nome fica em `quem_outro`. */
export interface PagamentoContrato {
  quem: string
  quem_outro?: string | null
  /** Forma: 'avista' | 'parcelado' | 'mensalidade'. */
  forma?: string | null
  data?: string | null
  parcelas?: number | null
  valor_parcela?: number | null
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

/**
 * Campos da PROPOSTA COMERCIAL no layout KA (documento com capa, seções
 * numeradas, cards de investimento e aceite). Todos opcionais: seção sem
 * conteúdo não aparece. `*asteriscos*` viram negrito nos textos.
 */
export interface PropostaCampos {
  /** Frase sob o título, na capa. */
  subtitulo?: string
  /** Cidade/UF do cliente (ficha ENDEREÇO). */
  cidade?: string
  /** Seção 01 · Objeto da proposta. */
  objeto?: string
  /** Painel esquerdo da seção 02: 1ª linha TÍTULO, 2ª subtítulo, demais linhas = itens. */
  painel_a?: string
  /** Painel direito da seção 02 (mesmo formato). */
  painel_b?: string
  /** Box de destaque da seção 02: 1ª linha TÍTULO, resto = texto. */
  destaque?: string
  /** Seção 03 · Incluído na mensalidade: um ✓ por linha. */
  incluso?: string
  /** Box "Necessário da cliente" da seção 03. */
  necessario?: string
  /** Seção 04 · Prazo de implantação. */
  prazo?: string
  /** Seção 04 · Entrega. */
  entrega?: string
  /** Seção 05 · Fases futuras: uma por linha, "Nome | descrição". */
  fases?: string
  /** Card de implantação (seção 06). */
  impl_titulo?: string
  impl_valor?: string
  impl_sub?: string
  impl_desc?: string
  /** Card de mensalidade (seção 06). */
  mensal_titulo?: string
  mensal_valor?: string
  mensal_desc?: string
  /** Régua de condições (seção 06). */
  pagamento?: string
  fidelidade?: string
  reajuste?: string
  /** Próximos passos, no box de aceite. */
  proximos?: string
  /** Cidade do rodapé (ex.: Porto Alegre, RS). */
  cidade_rodape?: string
}

export interface Orcamento {
  id: string
  cliente_id: string | null
  destinatario_nome: string
  destinatario_email: string | null
  destinatario_telefone: string | null
  destinatario_documento: string | null
  /** Dados da empresa/fundador copiados da ficha, para entrar no contrato. */
  razao_social?: string | null
  fundador_nome?: string | null
  fundador_cpf?: string | null
  titulo: string
  descricao: string | null
  itens: OrcamentoItem[]
  desconto: number
  valor_total: number
  condicoes: string | null
  validade: string | null
  /** Proposta comercial no layout KA (null/ausente = documento simples). */
  proposta?: PropostaCampos | null
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
  /** Telefone do destinatário (copiado do orçamento), para o WhatsApp. */
  telefone?: string | null
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
  /** VM Rocks participa desta cobrança (aparece na visão financeira dela). */
  vm_participa?: boolean | null
  /** Quanto a VM Rocks tem a receber nesta cobrança (às vezes difere do valor
   * total cobrado do cliente). Usado só quando `vm_participa`. */
  valor_vm?: number | null
  /** Cobrança COM nota fiscal? Define qual PIX entra na mensagem: com nota =
   *  conta da empresa (chave CNPJ); sem nota = conta pessoal. undefined = a KA
   *  ainda não marcou (a mensagem deixa ela escolher na hora). */
  com_nota?: boolean | null
  /** Telefone do destinatário (copiado do orçamento), para o WhatsApp. */
  telefone?: string | null
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
