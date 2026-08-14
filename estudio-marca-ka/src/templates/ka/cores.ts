// Cores oficiais da KA | Inteligência para Marcas (padrão dos carrosséis).
// Agora TODAS as 8 cores da paleta ficam disponíveis como fundo e como cor de
// texto em qualquer card da KA. A cor do texto pode ser "Automático" (contraste
// calculado a partir do fundo) ou uma cor fixa da paleta.

/** Cores oficiais da paleta KA (fundo e texto). As 6 da marca vêm primeiro
 *  (Cream, Bege Quente, Cobre, Caramelo, Essência, Marinho); as demais ficam
 *  como opções extras. */
export const FUNDOS_KA = [
  // Paleta oficial da marca (jul/2026)
  { valor: 'cream', rotulo: 'Cream', hex: '#E7E0CD' },
  { valor: 'bege-quente', rotulo: 'Bege Quente', hex: '#C2AA8A' },
  { valor: 'cobre', rotulo: 'Cobre', hex: '#8B5A2B' },
  { valor: 'caramelo', rotulo: 'Caramelo', hex: '#C47830' },
  { valor: 'essencia', rotulo: 'Azul Essência', hex: '#3D6B7E' },
  { valor: 'marinho', rotulo: 'Marinho', hex: '#152535' },
  // Extras (claros e detalhes)
  { valor: 'papel', rotulo: 'Papel', hex: '#F8F7F2' },
  { valor: 'bege-leve', rotulo: 'Bege Leve', hex: '#F7F3EA' },
  { valor: 'bege-papel', rotulo: 'Bege Papel', hex: '#E8E4DB' },
  { valor: 'dourado-claro', rotulo: 'Dourado Claro', hex: '#D4C49E' },
  { valor: 'mostarda', rotulo: 'Mostarda', hex: '#E0B880' },
  { valor: 'dourado', rotulo: 'Dourado', hex: '#B89B6A' },
  { valor: 'preto', rotulo: 'Preto KA', hex: '#0F1923' },
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

/** Luminância YIQ (0–255) de um hex. */
function yiqDe(hex: string): number {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000
}

/** true se o fundo é escuro (→ texto/logo claros). Limiar YIQ. */
export function ehFundoEscuroKA(fundo: string): boolean {
  return yiqDe(hexFundoKA(fundo)) < 150
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

/** Cor de destaque (aspas/*asteriscos*, números): caramelo por padrão. Quando o
 *  caramelo não contrasta com o fundo (fundos quentes/dourados ou o próprio
 *  caramelo/cobre), troca por marinho (fundo claro) ou mostarda (fundo escuro),
 *  para o destaque SEMPRE aparecer. */
export function corDestaqueKA(fundo: string): string {
  const yFundo = yiqDe(hexFundoKA(fundo))
  const yCaramelo = yiqDe(COR_CARAMELO)
  // Caramelo tem contraste suficiente com o fundo → usa caramelo.
  if (Math.abs(yFundo - yCaramelo) >= 60) return COR_CARAMELO
  // Contraste fraco: destaca com a cor oposta ao fundo.
  return yFundo < 128 ? COR_MOSTARDA : COR_MARINHO
}

/** Paleta para o card da marca no painel interno. */
export const PALETA_KA = FUNDOS_KA.map((f) => f.hex)
