import type { CSSProperties } from 'react'

// ============================================================================
// Texturas de fundo da KA — padrões geométricos gerados por CSS (sem imagem),
// então ficam nítidos em qualquer tamanho e são recoloríveis. A intensidade
// (slider "mais clara / mais escura") controla a opacidade das linhas.
// ============================================================================

export const TEXTURAS_KA = [
  { id: 'nenhuma', rotulo: 'Nenhuma', cell: 0 },
  { id: 'grid', rotulo: 'Grid Quadrado', cell: 54 },
  { id: 'grid-fino', rotulo: 'Grid Fino', cell: 34 },
  { id: 'diamante', rotulo: 'Diamante', cell: 46 },
  { id: 'linhas', rotulo: 'Linhas', cell: 42 },
  { id: 'diagonal', rotulo: 'Diagonal', cell: 42 },
  { id: 'xadrez', rotulo: 'Xadrez', cell: 40 },
] as const

export type TexturaKA = (typeof TEXTURAS_KA)[number]['id']

const cellDe = (id: string) => TEXTURAS_KA.find((t) => t.id === id)?.cell ?? 0

/** hex '#RRGGBB' → 'r,g,b' */
export function hexParaRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r},${g},${b}`
}

/** Intensidade 0–100 → opacidade das linhas (subtil a marcada). */
export function alphaTextura(intensidade: number): number {
  const i = Math.min(100, Math.max(0, Number.isFinite(intensidade) ? intensidade : 40))
  return +(0.05 + (i / 100) * 0.3).toFixed(3)
}

/**
 * Estilo CSS de uma textura. `corHex` é a cor das linhas (normalmente a cor do
 * texto do card, para contrastar com o fundo); `alpha` a opacidade; `escala`
 * reduz o padrão para a miniatura do seletor (1 = tamanho real do card).
 */
export function estiloTextura(
  id: string,
  corHex: string,
  alpha: number,
  escala = 1,
): CSSProperties {
  if (id === 'nenhuma' || !id) return {}
  const rgb = hexParaRgb(corHex)
  const cor = `rgba(${rgb},${alpha})`
  const c = Math.max(3, Math.round(cellDe(id) * escala))
  const linha = Math.max(1, Math.round(escala < 0.5 ? 1 : 1.5))

  switch (id) {
    case 'grid':
    case 'grid-fino':
      return {
        backgroundImage: `linear-gradient(${cor} ${linha}px, transparent ${linha}px), linear-gradient(90deg, ${cor} ${linha}px, transparent ${linha}px)`,
        backgroundSize: `${c}px ${c}px`,
      }
    case 'diamante':
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${cor} 0 ${linha}px, transparent ${linha}px ${c}px), repeating-linear-gradient(-45deg, ${cor} 0 ${linha}px, transparent ${linha}px ${c}px)`,
      }
    case 'linhas':
      return {
        backgroundImage: `repeating-linear-gradient(90deg, ${cor} 0 ${linha}px, transparent ${linha}px ${c}px)`,
      }
    case 'diagonal':
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${cor} 0 ${linha}px, transparent ${linha}px ${c}px)`,
      }
    case 'xadrez':
      return {
        backgroundImage: `conic-gradient(${cor} 25%, transparent 0 50%, ${cor} 0 75%, transparent 0)`,
        backgroundSize: `${c * 2}px ${c * 2}px`,
      }
    default:
      return {}
  }
}
