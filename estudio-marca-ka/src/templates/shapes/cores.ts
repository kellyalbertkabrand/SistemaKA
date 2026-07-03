// Paleta oficial da Shapes.
//
// Primárias: extraídas dos vetores oficiais (elementos/cores-formas.svg).
// Secundárias ("gama de possibilidades cromáticas"): a marca assume liberdade
// cromática — o cliente pode escolher QUALQUER cor no seletor; estas são só
// sugestões rápidas aproximadas da paleta da marca. Hex exatos podem ser
// ajustados quando a KA passar os valores fechados.

export interface Amostra {
  valor: string
  rotulo: string
}

// As 3 cores-base da marca.
export const CORES_PRIMARIAS: Amostra[] = [
  { valor: '#FF7829', rotulo: 'Laranja' },
  { valor: '#010101', rotulo: 'Preto' },
  { valor: '#FFFFFF', rotulo: 'Branco' },
]

// Gama secundária (sugestões).
export const CORES_SECUNDARIAS: Amostra[] = [
  { valor: '#F58A5E', rotulo: 'Coral' },
  { valor: '#F09A3E', rotulo: 'Laranja claro' },
  { valor: '#F4C64A', rotulo: 'Amarelo' },
  { valor: '#9CB27E', rotulo: 'Verde sálvia' },
  { valor: '#6E6B3C', rotulo: 'Oliva' },
  { valor: '#0E4D3C', rotulo: 'Verde escuro' },
  { valor: '#35B5A3', rotulo: 'Turquesa' },
  { valor: '#8B2FC9', rotulo: 'Roxo' },
  { valor: '#A98BE0', rotulo: 'Lilás' },
  { valor: '#8E4767', rotulo: 'Vinho' },
  { valor: '#7C0E2B', rotulo: 'Bordô' },
  { valor: '#F14E48', rotulo: 'Vermelho' },
  { valor: '#F0B6DE', rotulo: 'Rosa' },
  { valor: '#F6B8AE', rotulo: 'Rosa claro' },
  { valor: '#3D1207', rotulo: 'Marrom' },
  { valor: '#EDE9DE', rotulo: 'Creme' },
]

// Paleta completa para os seletores de cor de fundo.
export const PALETA_SHAPES: Amostra[] = [...CORES_PRIMARIAS, ...CORES_SECUNDARIAS]

// Preto ou branco da marca, o que tiver mais contraste com o fundo — para
// logo e texto continuarem legíveis em qualquer cor da gama.
export function corContraste(fundo: string): '#010101' | '#FFFFFF' {
  const m = /^#?([0-9a-f]{6})$/i.exec(fundo.trim())
  if (!m) return '#FFFFFF'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  // luminância percebida (YIQ). Limiar 160 para o laranja da marca (~151)
  // ficar com tinta branca, como no card de feedback; só cores realmente
  // claras (amarelo, creme, rosas) recebem tinta preta.
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 160 ? '#010101' : '#FFFFFF'
}
