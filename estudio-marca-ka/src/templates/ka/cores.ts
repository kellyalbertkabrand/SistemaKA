// Cores oficiais da KA | Inteligência para Marcas (padrão dos carrosséis).
// Diferente da Shapes (liberdade cromática), a KA trava o fundo em SOMENTE
// três cores; a cor do texto e a cor de destaque derivam do fundo escolhido.

/** Os três fundos permitidos no padrão KA. */
export const FUNDOS_KA = [
  { valor: 'bege', rotulo: 'Bege / Papel', hex: '#F2EEE3' },
  { valor: 'marinho', rotulo: 'Azul / Marinho', hex: '#152535' },
  { valor: 'caramelo', rotulo: 'Laranja / Caramelo', hex: '#C47830' },
] as const

export type FundoKA = (typeof FUNDOS_KA)[number]['valor']

/** Detalhes (nunca fundo): Essência e Mostarda. */
export const COR_ESSENCIA = '#3D6B7E'
export const COR_MOSTARDA = '#E0B880'
export const COR_CARAMELO = '#C47830'
export const COR_PAPEL = '#F2EEE3'
export const COR_MARINHO = '#152535'
export const COR_CLARO = '#F4F1EB'

/** Hex do fundo a partir do valor do select (com fallback bege). */
export function hexFundoKA(fundo: string): string {
  return FUNDOS_KA.find((f) => f.valor === fundo)?.hex ?? COR_PAPEL
}

/** Combinação oficial fundo → cor do texto: bege → marinho · azul → claro · laranja → papel. */
export function corTextoKA(fundo: string): string {
  if (fundo === 'marinho') return COR_CLARO
  if (fundo === 'caramelo') return COR_PAPEL
  return COR_MARINHO
}

/** Cor de destaque (números, palavras fortes, CTA): caramelo — exceto sobre
 *  o próprio caramelo, onde o destaque vira papel para manter contraste. */
export function corDestaqueKA(fundo: string): string {
  return fundo === 'caramelo' ? COR_PAPEL : COR_CARAMELO
}

/** Paleta para o card da marca no painel interno. */
export const PALETA_KA = [COR_PAPEL, COR_MARINHO, COR_CARAMELO, COR_ESSENCIA, COR_MOSTARDA, COR_CLARO]
