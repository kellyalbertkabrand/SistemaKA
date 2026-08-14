import type { ReactNode } from 'react'

// Ênfase no texto do usuário, sem innerHTML: palavra/frase entre ASPAS
// ("..." ou “...") vira NEGRITO; *asteriscos* viram itálico.
const RE_ENFASE = /“([^”]+)”|"([^"]+)"|\*([^*]+)\*/g

export function comEnfase(texto: string): ReactNode[] {
  const nos: ReactNode[] = []
  let ultimo = 0
  let k = 0
  let m: RegExpExecArray | null
  RE_ENFASE.lastIndex = 0
  while ((m = RE_ENFASE.exec(texto))) {
    if (m.index > ultimo) nos.push(<span key={k++}>{texto.slice(ultimo, m.index)}</span>)
    if (m[3] !== undefined) nos.push(<em key={k++}>{m[3]}</em>)
    else nos.push(<strong key={k++}>{m[1] ?? m[2]}</strong>)
    ultimo = RE_ENFASE.lastIndex
  }
  if (ultimo < texto.length) nos.push(<span key={k++}>{texto.slice(ultimo)}</span>)
  return nos
}
