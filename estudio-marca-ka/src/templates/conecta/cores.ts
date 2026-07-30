// ============================================================================
// Paleta d'O Conecta (marca provisória — jul/2026).
//
// ⚠️ PROVISÓRIO: estes valores são um ponto de partida limpo e moderno para a
// marca aparecer no Estúdio já funcionando. Quando a KA passar a identidade
// oficial (logo, cores fechadas e fontes), basta trocar os hexes abaixo e as
// fontes em `conecta.css` — a estrutura dos cards continua a mesma.
// ============================================================================

export interface FundoConecta {
  /** Chave guardada no campo (ex.: 'azul'). */
  valor: string
  /** Rótulo mostrado na amostra. */
  rotulo: string
  /** Cor real (hex) da amostra. */
  hex: string
}

// Paleta oficial provisória — fundo e texto escolhem daqui.
export const FUNDOS_CONECTA: FundoConecta[] = [
  { valor: 'azul', rotulo: 'Azul Conecta', hex: '#16324F' },
  { valor: 'ceu', rotulo: 'Azul Vivo', hex: '#2E7BE4' },
  { valor: 'agua', rotulo: 'Verde-água', hex: '#14B8A6' },
  { valor: 'coral', rotulo: 'Coral', hex: '#FF6B5C' },
  { valor: 'creme', rotulo: 'Creme', hex: '#F4F1EA' },
  { valor: 'grafite', rotulo: 'Grafite', hex: '#16181D' },
  { valor: 'branco', rotulo: 'Branco', hex: '#FFFFFF' },
]

/** Cor de destaque (acento) da marca — usada para grafismos e botões. */
export const COR_ACENTO = '#FF6B5C'
export const COR_AZUL = '#16324F'

const MAPA = new Map(FUNDOS_CONECTA.map((f) => [f.valor, f.hex]))

/** Resolve a chave da paleta (ou um hex direto) para um hex. */
export function hexFundo(valor: string): string {
  return MAPA.get(valor) ?? valor ?? '#16324F'
}

/** Luminância YIQ do hex (0–255). Acima de ~150 = fundo claro. */
function yiq(hex: string): number {
  const h = hex.replace('#', '')
  if (h.length < 6) return 255
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000
}

/** Fundo é escuro? (para logo/textos externos). */
export function ehFundoEscuro(valor: string): boolean {
  return yiq(hexFundo(valor)) < 150
}

/**
 * Cor do texto: 'auto' = contraste com o fundo (branco no escuro, grafite no
 * claro). Uma chave da paleta = essa cor fixa. Um hex = ele mesmo.
 */
export function corFonte(valor: string | number | undefined, fundo: string): string {
  const v = String(valor || 'auto')
  if (v === 'auto' || v === '') {
    return ehFundoEscuro(fundo) ? '#FFFFFF' : '#16181D'
  }
  return hexFundo(v)
}

/** Cor de destaque que contrasta com o fundo: coral, salvo em fundo coral. */
export function corDestaque(fundo: string): string {
  const hex = hexFundo(fundo)
  // Em fundo coral, o acento coral some — usa o verde-água.
  if (hex.toUpperCase() === '#FF6B5C') return '#14B8A6'
  return COR_ACENTO
}

/** Amostras da paleta para os cards do painel interno. */
export const PALETA_CONECTA = FUNDOS_CONECTA.map((f) => f.hex)
