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

// Logo da Shapes nas 3 cores da marca (preto, branco, laranja #E37037).
// `corLogo`: 'auto' (segue o fundo), 'preto', 'branco' ou 'laranja'.
export function logoShapes(corLogo: string, corFundo: string): string {
  const base = '/clientes/shapes/'
  let escolha = corLogo || 'auto'
  if (escolha === 'auto') {
    escolha = corContraste(corFundo) === '#FFFFFF' ? 'branco' : 'preto'
  }
  if (escolha === 'laranja') return `${base}shapes-logo-laranja.png`
  if (escolha === 'preto') return `${base}shapes-logo-preto.png`
  return `${base}shapes-logo-branco.png`
}

// Cor (hex) do LOGO da Shapes, na mesma lógica do logoShapes — usada onde o
// logo é desenhado como TEXTO (o "shapes" ao lado do símbolo na Capa), para o
// símbolo e a palavra ficarem SEMPRE da mesma cor (o bug do "metade preto,
// metade branco" era o símbolo seguir o logo e a palavra seguir a cor do texto).
export function corLogoShapes(corLogo: string, corFundo: string): string {
  const escolha =
    (corLogo || 'auto') === 'auto'
      ? corContraste(corFundo) === '#FFFFFF'
        ? 'branco'
        : 'preto'
      : corLogo
  if (escolha === 'laranja') return '#E37037'
  if (escolha === 'branco') return '#FFFFFF'
  return '#010101'
}

// Converte um hex (#rrggbb) para rgba com a transparência dada (0–1). Usado na
// caixa de texto translúcida sobre a foto no template "Imagem inteira".
export function comAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha})`
}

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
