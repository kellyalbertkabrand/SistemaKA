import type { ComponentType } from 'react'
import type { FormatoPeca } from '../lib/database.types'

// ============================================================================
// Sistema de templates ("moldes com campos").
//
// Cada layout validado pela KA vira um Template: uma marca (cliente), um ou
// mais formatos suportados e uma lista de CAMPOS que o cliente preenche
// (texto, imagem, estrelas, seleção…). O componente `render` desenha a arte
// no tamanho real (1080px de largura) a partir dos valores dos campos.
// ============================================================================

export type CampoTipo =
  | 'texto'
  | 'textarea'
  | 'imagem'
  | 'estrelas'
  | 'select'
  | 'cor'
  | 'paleta'
  | 'forma'
  | 'textura'
  | 'range'

export interface CampoBase {
  id: string
  label: string
  tipo: CampoTipo
  ajuda?: string
  obrigatorio?: boolean
}

export interface CampoTexto extends CampoBase {
  tipo: 'texto' | 'textarea'
  placeholder?: string
  padrao?: string
  maxLen?: number
}

export interface CampoImagem extends CampoBase {
  tipo: 'imagem'
  /** Tamanho inicial da foto (%) no slider "Tamanho da foto". Padrão 92. */
  areaPadrao?: number
  /** Aceita também vídeo (mp4/mov/webm) além de imagem. */
  aceitaVideo?: boolean
  /** Mostra controles separados de Largura e Altura da área (%). */
  redimensionavel2d?: boolean
}

export interface CampoEstrelas extends CampoBase {
  tipo: 'estrelas'
  padrao?: number
}

export interface CampoSelect extends CampoBase {
  tipo: 'select'
  opcoes: { valor: string; rotulo: string }[]
  padrao?: string
  /** Mostra as opções como botões visuais (chips). Para proporções (ex.: 16:9)
   *  desenha um retângulo na proporção, para a pessoa escolher olhando. */
  chips?: boolean
}

export interface CampoCor extends CampoBase {
  tipo: 'cor'
  padrao?: string
  /** Amostras (swatches) sugeridas, além do seletor livre. */
  opcoes?: { valor: string; rotulo?: string }[]
}

export interface CampoForma extends CampoBase {
  tipo: 'forma'
  padrao?: string
}

// Paleta fixa: mostra amostras (bolinhas) com a cor real, mas guarda a CHAVE
// (ex.: 'marinho') — não o hex. `cor` vazio/ausente = amostra "Automático".
export interface CampoPaleta extends CampoBase {
  tipo: 'paleta'
  padrao?: string
  opcoes: { valor: string; rotulo: string; cor?: string }[]
}

/** Textura de fundo (padrão geométrico) + intensidade. As opções vêm de
 *  TEXTURAS_KA; o valor guarda o id da textura e o companheiro `${id}_int`
 *  guarda a intensidade (0–100). */
export interface CampoTextura extends CampoBase {
  tipo: 'textura'
  padrao?: string
  intensidadePadrao?: number
}

/** Controle deslizante (slider) numérico simples — ex.: tamanho do texto. */
export interface CampoRange extends CampoBase {
  tipo: 'range'
  min: number
  max: number
  passo?: number
  padrao?: number
}

export type Campo =
  | CampoTexto
  | CampoImagem
  | CampoEstrelas
  | CampoSelect
  | CampoCor
  | CampoPaleta
  | CampoForma
  | CampoTextura
  | CampoRange

/** Dimensões reais (px) de cada formato suportado pelo template. */
export interface FormatoDef {
  formato: FormatoPeca
  rotulo: string
  largura: number
  altura: number
}

/** Valores preenchidos pelo cliente, indexados por `campo.id`. */
export type ValoresPeca = Record<string, string | number>

export interface RenderProps {
  valores: ValoresPeca
  formato: FormatoDef
}

export interface Template {
  id: string
  clienteSlug: string
  clienteNome: string
  nome: string
  descricao: string
  formatos: FormatoDef[]
  campos: Campo[]
  /** Componente que desenha a arte em tamanho real. */
  render: ComponentType<RenderProps>
}

/** Preenche os valores iniciais a partir dos padrões dos campos. */
export function valoresPadrao(campos: Campo[]): ValoresPeca {
  const v: ValoresPeca = {}
  for (const c of campos) {
    if (c.tipo === 'estrelas') v[c.id] = c.padrao ?? 5
    else if (c.tipo === 'select') v[c.id] = c.padrao ?? c.opcoes[0]?.valor ?? ''
    else if (c.tipo === 'paleta') v[c.id] = c.padrao ?? c.opcoes[0]?.valor ?? ''
    else if (c.tipo === 'cor') v[c.id] = c.padrao ?? '#000000'
    else if (c.tipo === 'forma') v[c.id] = c.padrao ?? 'shape-blob1'
    else if (c.tipo === 'range') v[c.id] = c.padrao ?? c.min
    else if (c.tipo === 'texto' || c.tipo === 'textarea') v[c.id] = c.padrao ?? ''
    else if (c.tipo === 'textura') {
      v[c.id] = c.padrao ?? 'nenhuma'
      v[`${c.id}_int`] = c.intensidadePadrao ?? 40
    } else if (c.tipo === 'imagem') v[`${c.id}_area`] = c.areaPadrao ?? 92
    else v[c.id] = ''
  }
  return v
}
