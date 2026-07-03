import type { CSSProperties } from 'react'
import type { ValoresPeca } from './types'

// Enquadramento da foto: posição (pan) e zoom controlados pelo cliente.
// Os valores companheiros ficam em `${id}_x`, `${id}_y` (0–100) e `${id}_zoom`
// (percentual, 100 = normal). Templates com foto aplicam este estilo na <img>.
export function estiloImagem(valores: ValoresPeca, id: string): CSSProperties {
  const x = Number(valores[`${id}_x`] ?? 50)
  const y = Number(valores[`${id}_y`] ?? 50)
  const zoom = Number(valores[`${id}_zoom`] ?? 100) / 100
  return {
    objectFit: 'cover',
    objectPosition: `${x}% ${y}%`,
    transform: `scale(${zoom})`,
  }
}
