import type { CSSProperties } from 'react'
import type { ValoresPeca } from './types'

// Enquadramento da foto: posição (pan) e zoom controlados pelo cliente.
// Os valores companheiros ficam em `${id}_x`, `${id}_y` (0–100) e `${id}_zoom`
// (percentual, 100 = normal). Templates com foto aplicam este estilo na <img>.
//
// O pan usa `object-position`, que dá RANGE COMPLETO: quando a foto é mais
// larga (ou mais alta) que a moldura — retângulo numa moldura mais estreita —
// dá para arrastar até o CANTO esquerdo OU direito da foto (o `cover` recorta o
// excedente e o object-position escolhe qual parte aparece). Antes o pan era um
// `translate` preso a uma folga de 12%, então numa foto larga mal saía do meio.
//
// Uma folga mínima de zoom garante um arrasto leve também quando a foto tem a
// MESMA proporção da moldura (aí o movimento vem do transform-origin do zoom).
const FOLGA = 1.05

const clamp = (n: number) => Math.min(100, Math.max(0, Number.isFinite(n) ? n : 50))

export function estiloImagem(valores: ValoresPeca, id: string): CSSProperties {
  const x = clamp(Number(valores[`${id}_x`] ?? 50))
  const y = clamp(Number(valores[`${id}_y`] ?? 50))
  const zoom = Math.max(Number(valores[`${id}_zoom`] ?? 100) / 100, 1) * FOLGA
  return {
    objectFit: 'cover',
    objectPosition: `${x}% ${y}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${x}% ${y}%`,
  }
}
