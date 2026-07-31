// ============================================================================
// Paleta do Conecta · Núcleo de Negócios ACIGRA (Gravataí).
//
// Identidade real (extraída dos posts oficiais): símbolo/wordmark em ciano
// vibrante sobre um gradiente azul-marinho → índigo elétrico, texto branco.
//
// ⚠️ Logo: recriado em vetor (ConectaLogo) porque o PNG oficial do Canva não
// pôde ser baixado nesta sessão (egresso bloqueado). Ao anexar o PNG oficial,
// trocar em `public/clientes/conecta/`.
// ============================================================================

// Cores OFICIAIS da marca (amostradas do guia no Canva).
export const COR_CIANO = '#0CD9D2' // ciano do símbolo, títulos e destaques
export const COR_INDIGO = '#2A1FB4' // azul-índigo (brilho do gradiente dos posts)
export const COR_MARINHO = '#021734' // azul-marinho profundo (fundo oficial)
export const COR_PRETO_AZUL = '#010B1F' // quase-preto azulado
export const COR_BRANCO = '#FFFFFF'

// Gradiente-assinatura dos cards: marinho profundo com um brilho índigo/azul à
// direita (como nos posts do Conecta), ancorado na cor de marca #021734.
export const GRADIENTE_CONECTA =
  'radial-gradient(130% 120% at 88% 42%, #123A8C 0%, #0A245C 26%, #041A3E 58%, #021734 100%)'

// Variante clara (para peças em fundo claro, se a KA quiser).
export const GRADIENTE_CLARO =
  'linear-gradient(135deg, #EAF6F5 0%, #DCEFFB 100%)'

export interface FundoConecta {
  valor: string
  rotulo: string
  hex: string
  /** Fundo pintado como gradiente (não cor sólida). */
  gradiente?: string
}

// Fundos oferecidos no editor. O gradiente-assinatura é o padrão.
export const FUNDOS_CONECTA: FundoConecta[] = [
  { valor: 'gradiente', rotulo: 'Gradiente Conecta', hex: '#0A245C', gradiente: GRADIENTE_CONECTA },
  { valor: 'marinho', rotulo: 'Azul-marinho', hex: COR_MARINHO },
  { valor: 'indigo', rotulo: 'Índigo', hex: COR_INDIGO },
  { valor: 'preto', rotulo: 'Preto azulado', hex: COR_PRETO_AZUL },
  { valor: 'ciano', rotulo: 'Ciano', hex: COR_CIANO },
  { valor: 'branco', rotulo: 'Branco', hex: COR_BRANCO },
  { valor: 'claro', rotulo: 'Claro (degradê)', hex: '#E4F2F7', gradiente: GRADIENTE_CLARO },
]

const MAPA = new Map(FUNDOS_CONECTA.map((f) => [f.valor, f]))

/** CSS de background para a chave da paleta (gradiente ou hex) — ou um hex direto. */
export function fundoCss(valor: string): string {
  const f = MAPA.get(valor)
  if (f) return f.gradiente ?? f.hex
  return valor || GRADIENTE_CONECTA
}

/** Hex representativo do fundo (para calcular contraste). */
export function hexRepresentativo(valor: string): string {
  const f = MAPA.get(valor)
  if (f) return f.hex
  return valor || COR_MARINHO
}

/** Luminância YIQ (0–255). */
function yiq(hex: string): number {
  const h = hex.replace('#', '')
  if (h.length < 6) return 255
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000
}

/** Fundo é escuro? (gradiente Conecta conta como escuro). */
export function ehFundoEscuro(valor: string): boolean {
  if (valor === 'gradiente' || valor === 'marinho' || valor === 'indigo' || valor === 'preto') return true
  if (valor === 'claro' || valor === 'branco') return false
  return yiq(hexRepresentativo(valor)) < 150
}

/**
 * Cor do texto: 'auto' = contraste com o fundo (branco no escuro, marinho no
 * claro). Uma chave da paleta = essa cor. Um hex = ele mesmo.
 */
export function corFonte(valor: string | number | undefined, fundo: string): string {
  const v = String(valor || 'auto')
  if (v === 'auto' || v === '') {
    return ehFundoEscuro(fundo) ? COR_BRANCO : COR_MARINHO
  }
  return hexRepresentativo(v)
}

/** Cor de destaque (títulos de seção, ícones): ciano — salvo em fundo ciano. */
export function corDestaque(fundo: string): string {
  if (fundo === 'ciano' || hexRepresentativo(fundo).toUpperCase() === COR_CIANO.toUpperCase()) {
    return COR_MARINHO
  }
  return COR_CIANO
}

/** Amostras para o card do painel interno. */
export const PALETA_CONECTA = [COR_CIANO, COR_INDIGO, COR_MARINHO, COR_PRETO_AZUL, COR_BRANCO]
