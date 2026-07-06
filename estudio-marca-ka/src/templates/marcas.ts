// Identidade visual de cada marca PARA O PAINEL INTERNO (cards de cliente).
// Não afeta os templates — é só a "capa" da marca dentro do sistema da KA.
// Quando o Painel Admin (Fase 2) for para o Supabase, estes metadados
// passam a vir do banco junto com os templates.

import { CORES_PRIMARIAS, CORES_SECUNDARIAS } from './shapes/cores'
import { PALETA_KA, COR_MARINHO } from './ka/cores'

export interface MarcaVisual {
  /** Cor principal da marca (fallback da capa e detalhes). */
  corPrincipal: string
  /** Imagem de capa do card (textura/fundo oficial da marca). */
  capa?: string
  /** Logo para exibir sobre a capa. */
  logo?: string
  /** Amostras da paleta exibidas no card (6–8 já bastam). */
  paleta: string[]
  /** Uma linha sobre a marca, para o card do painel. */
  tagline?: string
}

const MARCAS: Record<string, MarcaVisual> = {
  shapes: {
    corPrincipal: '#FF7829',
    capa: '/clientes/shapes/fundo-shapes.jpg',
    logo: '/clientes/shapes/shapes-logo-branco.png',
    paleta: [
      ...CORES_PRIMARIAS.map((c) => c.valor),
      ...CORES_SECUNDARIAS.slice(0, 5).map((c) => c.valor),
    ],
    tagline: 'Objetos de decoração — forma, função e emoção.',
  },
  ka: {
    corPrincipal: COR_MARINHO,
    logo: '/clientes/ka/ka-branco.png',
    paleta: PALETA_KA,
    tagline: 'Branding · Posicionamento · IA — os carrosséis da própria KA.',
  },
}

/** Visual da marca, com fallback neutro para clientes ainda sem capa. */
export function marcaVisual(slug: string): MarcaVisual {
  return (
    MARCAS[slug] ?? {
      corPrincipal: '#152535',
      paleta: [],
    }
  )
}
