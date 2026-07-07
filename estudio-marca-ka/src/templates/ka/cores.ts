// Cores oficiais da KA | Inteligência para Marcas (padrão dos carrosséis).
// Agora TODAS as 8 cores da paleta ficam disponíveis como fundo e como cor de
// texto em qualquer card da KA. A cor do texto pode ser "Automático" (contraste
// calculado a partir do fundo) ou uma cor fixa da paleta.

/** As 8 cores oficiais da paleta KA (fundo e texto). */
export const FUNDOS_KA = [
  { valor: 'papel', rotulo: 'Papel', hex: '#F8F7F2' },
  { valor: 'essencia', rotulo: 'Azul Essência', hex: '#3D6B7E' },
  { valor: 'dourado', rotulo: 'Dourado', hex: '#B89B6A' },
  { valor: 'preto', rotulo: 'Preto KA', hex: '#0F1923' },
  { valor: 'caramelo', rotulo: 'Caramelo', hex: '#C47830' },
  { valor: 'cobre', rotulo: 'Cobre', hex: '#8B5A2B' },
  { valor: 'marinho', rotulo: 'Marinho', hex: '#152535' },
  { valor: 'mostarda', rotulo: 'Mostarda', hex: '#E0B880' },
] as const

export type FundoKA = (typeof FUNDOS_KA)[number]['valor']

// Cores nomeadas (uso interno / detalhes).
export const COR_ESSENCIA = '#3D6B7E'
export const COR_MOSTARDA = '#E0B880'
export const COR_CARAMELO = '#C47830'
export const COR_PAPEL = '#F8F7F2'
export const COR_MARINHO = '#152535'
export const COR_CLARO = '#F4F1EB'

// Aliases de compatibilidade com valores antigos ('bege' era o papel).
const ALIAS: Record<string, string> = { bege: 'papel', laranja: 'caramelo' }
const resolver = (v: string) => ALIAS[v] ?? v

/** Hex do fundo a partir do valor (aceita valores antigos; fallback papel). */
export function hexFundoKA(fundo: string): string {
  const v = resolver(fundo)
  return FUNDOS_KA.find((f) => f.valor === v)?.hex ?? COR_PAPEL
}

/** true se o fundo é escuro (→ texto/logo claros). Limiar YIQ. */
export function ehFundoEscuroKA(fundo: string): boolean {
  const hex = hexFundoKA(fundo).replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq < 150
}

/** Cor do texto automática por contraste com o fundo. */
export function corTextoKA(fundo: string): string {
  return ehFundoEscuroKA(fundo) ? COR_CLARO : COR_MARINHO
}

/**
 * Cor do texto escolhida no campo `cor_fonte`. 'auto' (ou vazio) → contraste
 * automático; caso contrário, a cor da paleta escolhida.
 */
export function corFonteKA(corFonte: unknown, fundo: string): string {
  const v = String(corFonte || 'auto')
  if (v === 'auto') return corTextoKA(fundo)
  return hexFundoKA(v)
}

/** Cor de destaque (*asteriscos*, números): caramelo — mas sobre fundos
 *  caramelo/cobre vira marinho para manter contraste. */
export function corDestaqueKA(fundo: string): string {
  const v = resolver(fundo)
  return v === 'caramelo' || v === 'cobre' ? COR_MARINHO : COR_CARAMELO
}

/** Paleta para o card da marca no painel interno. */
export const PALETA_KA = FUNDOS_KA.map((f) => f.hex)
