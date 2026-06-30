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
  criado_em: string
}
