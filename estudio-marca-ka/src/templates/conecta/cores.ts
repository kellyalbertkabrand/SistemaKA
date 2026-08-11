// ============================================================================
// Conecta — Design System (Instagram). Cores e tokens conforme o documento
// oficial "CONECTA DESIGN SYSTEM" (ago/2026).
//
// Paleta: Navy dominante, Turquesa como ÚNICO acento, fundo warm (nunca branco
// puro). Tipografia Sora (light + bold). Nunca turquesa como fundo inteiro.
// ============================================================================

// --- Cores principais ---
export const COR_TURQUESA = '#00CEC9' // acento único (tags, keywords, linhas)
export const COR_NAVY = '#1B2A4A' // texto dominante / base dos gradientes
export const COR_WARM = '#FAF9F7' // fundo claro (warm, nunca #FFFFFF)

// --- Auxiliares ---
export const COR_DARK = '#0F1B33'
export const COR_DARKER = '#0a1222'
export const COR_GRAY = '#8395A7' // apoio em fundo escuro
export const COR_GRAY_DARK = '#636e72' // apoio em fundo claro
export const COR_WHITE_OFF = '#C8D6E5' // secundário em fundo escuro
export const COR_BRANCO = '#FFFFFF'

// --- Gradientes oficiais ---
export const GRADIENTE_NAVY =
  'linear-gradient(170deg, #0a1222 0%, #0F1B33 40%, #1B2A4A 100%)'
export const GRADIENTE_CTA =
  'radial-gradient(ellipse at 50% 40%, #243656 0%, #0F1B33 50%, #0a1222 100%)'

export interface FundoConecta {
  valor: string
  rotulo: string
  hex: string
  gradiente?: string
}

// Fundos oferecidos no editor. Famílias do sistema: escuro (navy / CTA /
// sólidos) e claro (warm / branco). Turquesa NUNCA é fundo inteiro.
export const FUNDOS_CONECTA: FundoConecta[] = [
  { valor: 'navy', rotulo: 'Navy (gradiente)', hex: COR_NAVY, gradiente: GRADIENTE_NAVY },
  { valor: 'cta', rotulo: 'Navy CTA (radial)', hex: COR_DARK, gradiente: GRADIENTE_CTA },
  { valor: 'navySolido', rotulo: 'Navy sólido', hex: COR_NAVY },
  { valor: 'escuro', rotulo: 'Escuro', hex: COR_DARK },
  { valor: 'preto', rotulo: 'Quase-preto', hex: COR_DARKER },
  { valor: 'warm', rotulo: 'Warm (claro)', hex: COR_WARM },
  { valor: 'branco', rotulo: 'Branco', hex: '#FFFFFF' },
]

const MAPA = new Map(FUNDOS_CONECTA.map((f) => [f.valor, f]))

// Cores escolhíveis para TEXTO e LOGO (além de "Automático").
export const COLORS_CONECTA: { valor: string; rotulo: string; hex: string }[] = [
  { valor: 'branco', rotulo: 'Branco', hex: '#FFFFFF' },
  { valor: 'navy', rotulo: 'Navy', hex: COR_NAVY },
  { valor: 'turquesa', rotulo: 'Turquesa', hex: COR_TURQUESA },
  { valor: 'cinza', rotulo: 'Cinza claro', hex: COR_GRAY },
  { valor: 'cinzaEscuro', rotulo: 'Cinza escuro', hex: COR_GRAY_DARK },
  { valor: 'grafite', rotulo: 'Grafite', hex: COR_DARK },
]
const MAPA_COR = new Map(COLORS_CONECTA.map((c) => [c.valor, c.hex]))

/** Resolve a cor escolhida (chave) para hex; 'auto'/vazio devolve null. */
export function corEscolhida(valor: string | number | undefined): string | null {
  const v = String(valor || 'auto')
  if (v === 'auto' || v === '') return null
  return MAPA_COR.get(v) ?? (v.startsWith('#') ? v : null)
}

/** CSS de background para a chave (gradiente ou hex), ou um hex direto. */
export function fundoCss(valor: string): string {
  const f = MAPA.get(valor)
  if (f) return f.gradiente ?? f.hex
  return valor || GRADIENTE_NAVY
}

/** Fundo é escuro? (warm e branco = claro; o resto = escuro). */
export function ehFundoEscuro(valor: string): boolean {
  return valor !== 'warm' && valor !== 'branco'
}

/** Cor do TÍTULO: branco no escuro, navy no claro. */
export function corTitulo(fundo: string): string {
  return ehFundoEscuro(fundo) ? COR_BRANCO : COR_NAVY
}

/** Cor do TEXTO DE APOIO: cinza claro no escuro, cinza escuro no claro. */
export function corApoio(fundo: string): string {
  return ehFundoEscuro(fundo) ? COR_GRAY : COR_GRAY_DARK
}

/** Acento (tags, linhas, keywords, número): SEMPRE turquesa. */
export function corAcento(): string {
  return COR_TURQUESA
}

/** Amostras para o card do painel interno. */
export const PALETA_CONECTA = [COR_NAVY, COR_TURQUESA, COR_WARM, COR_DARK, COR_GRAY]
