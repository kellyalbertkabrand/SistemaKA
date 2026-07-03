import type { CSSProperties } from 'react'
import type { ValoresPeca } from './types'

// Enquadramento da foto: posição (pan) e zoom controlados pelo cliente.
// Os valores companheiros ficam em `${id}_x`, `${id}_y` (0–100) e `${id}_zoom`
// (percentual, 100 = normal). Templates com foto aplicam este estilo na <img>.
//
// Para o pan responder nos DOIS eixos mesmo quando a foto tem a mesma proporção
// da moldura (retrato em card retrato), aplicamos uma folga mínima de zoom e
// movemos a imagem com translate (não `object-position`, que só desloca dentro
// do recorte já existente). O translate é limitado à folga para não mostrar borda.
const FOLGA = 1.12 // 12% de "sobra" garantida para arrastar

export function estiloImagem(valores: ValoresPeca, id: string): CSSProperties {
  const x = Number(valores[`${id}_x`] ?? 50)
  const y = Number(valores[`${id}_y`] ?? 50)
  const zoomRaw = Number(valores[`${id}_zoom`] ?? 100) / 100
  const escala = Math.max(zoomRaw, 1) * FOLGA
  // deslocamento máximo (%) sem revelar borda: metade da sobra, já compensando a escala.
  const max = ((escala - 1) / (2 * escala)) * 100
  const tx = ((50 - x) / 50) * max
  const ty = ((50 - y) / 50) * max
  return {
    objectFit: 'cover',
    transform: `scale(${escala}) translate(${tx}%, ${ty}%)`,
    transformOrigin: 'center',
  }
}
