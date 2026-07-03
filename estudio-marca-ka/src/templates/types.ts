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
  | 'forma'

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
}

export interface CampoEstrelas extends CampoBase {
  tipo: 'estrelas'
  padrao?: number
}

export interface CampoSelect extends CampoBase {
  tipo: 'select'
  opcoes: { valor: string; rotulo: string }[]
  padrao?: string
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

export type Campo =
  | CampoTexto
  | CampoImagem
  | CampoEstrelas
  | CampoSelect
  | CampoCor
  | CampoForma

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
    else if (c.tipo === 'cor') v[c.id] = c.padrao ?? '#000000'
    else if (c.tipo === 'forma') v[c.id] = c.padrao ?? 'shape-blob1'
    else if (c.tipo === 'texto' || c.tipo === 'textarea') v[c.id] = c.padrao ?? ''
    else if (c.tipo === 'imagem') v[`${c.id}_area`] = c.areaPadrao ?? 92
    else v[c.id] = ''
  }
  return v
}
