// Cores oficiais da Grazi Martini (extraídas do design no Canva).
// Mentora e Estrategista do Comportamento Humano · Método The One© · @sougrazimartini
// Paleta quente: verde musgo, terracota, vinho, mostarda/ocre, bege dourado e creme.

export const FUNDOS_GRAZI = [
  { valor: 'mostarda', rotulo: 'Mostarda', hex: '#AF7632' },
  { valor: 'terracota', rotulo: 'Terracota', hex: '#AA3D30' },
  { valor: 'vinho', rotulo: 'Vinho', hex: '#6F1D18' },
  { valor: 'verde', rotulo: 'Verde Musgo', hex: '#2A4131' },
  { valor: 'verde-escuro', rotulo: 'Verde Escuro', hex: '#1E3A2C' },
  { valor: 'bege-dourado', rotulo: 'Bege Dourado', hex: '#E8C79E' },
  { valor: 'creme', rotulo: 'Creme', hex: '#F3EEE8' },
  { valor: 'preto', rotulo: 'Preto', hex: '#181007' },
] as const

export type FundoGrazi = (typeof FUNDOS_GRAZI)[number]['valor']

// Cores nomeadas (detalhes fixos da marca).
export const COR_CREME = '#F2D1A7' // texto claro sobre fundos escuros
export const COR_ESCURO = '#2A4131' // texto sobre fundos claros (verde musgo)
export const COR_FAIXA = '#1E3A2C' // faixa/rodapé verde (elemento fixo)
export const COR_HANDLE = '#E7C69D' // @sougrazimartini (levemente mais suave)

export const PALETA_GRAZI = FUNDOS_GRAZI.map((f) => f.hex)

const ALIAS: Record<string, string> = {}
const resolver = (v: string) => ALIAS[v] ?? v

/** Hex do fundo a partir do valor (fallback mostarda). */
export function hexFundoGrazi(fundo: string): string {
  const v = resolver(fundo)
  return FUNDOS_GRAZI.find((f) => f.valor === v)?.hex ?? '#AF7632'
}

function yiqDe(hex: string): number {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000
}

/** true se o fundo é escuro (→ texto creme). Limiar YIQ. */
export function ehFundoEscuroGrazi(fundo: string): boolean {
  return yiqDe(hexFundoGrazi(fundo)) < 150
}

/** Cor do texto automática por contraste com o fundo. */
export function corTextoGrazi(fundo: string): string {
  return ehFundoEscuroGrazi(fundo) ? COR_CREME : COR_ESCURO
}

/** Cor do texto escolhida no campo `cor_fonte`: 'auto' = contraste; senão a cor da paleta. */
export function corFonteGrazi(corFonte: unknown, fundo: string): string {
  const v = String(corFonte || 'auto')
  if (v === 'auto') return corTextoGrazi(fundo)
  return hexFundoGrazi(v)
}
