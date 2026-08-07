import { COR_CIANO } from './cores'

// ============================================================================
// Ícones de LINHA do Conecta — elegantes, no traço fino da marca (como os
// ícones dos posts oficiais). Substituem os emojis. Cor = teal por padrão.
// ============================================================================

const PATHS: Record<string, JSX.Element> = {
  alvo: (
    <>
      <circle cx="12" cy="12" r="9.2" />
      <circle cx="12" cy="12" r="5.4" />
      <circle cx="12" cy="12" r="1.7" />
    </>
  ),
  coracao: (
    <path d="M12 20.2 4.3 12.6a4.6 4.6 0 0 1 6.5-6.5l1.2 1.2 1.2-1.2a4.6 4.6 0 0 1 6.5 6.5z" />
  ),
  maos: (
    <>
      <path d="M12 11.4 8.9 8.5a2.5 2.5 0 0 1 3.1-3.8 2.5 2.5 0 0 1 3.1 3.8z" />
      <path d="M3.5 14.5c1.6 0 2.6 1.3 4.2 1.3h5.1a1.4 1.4 0 0 0 0-2.8H9.4" />
      <path d="M3.5 14.5v4" />
    </>
  ),
  foguete: (
    <>
      <path d="M12 3c2.7 1.6 4.3 4.6 4.3 8.1L14 13.6H10L7.7 11.1C7.7 7.6 9.3 4.6 12 3z" />
      <circle cx="12" cy="9.3" r="1.5" />
      <path d="M10 13.8 7.8 17M14 13.8 16.2 17M12 13.6v4.2" />
    </>
  ),
  pessoas: (
    <>
      <path d="M16.5 20v-1.8a3.7 3.7 0 0 0-3.7-3.7H6.9a3.7 3.7 0 0 0-3.7 3.7V20" />
      <circle cx="9.8" cy="7.3" r="3.7" />
      <path d="M21.8 20v-1.8a3.7 3.7 0 0 0-2.8-3.6M15.3 3.7a3.7 3.7 0 0 1 0 7.2" />
    </>
  ),
  lampada: (
    <>
      <path d="M9.2 18h5.6M10 20.8h4" />
      <path d="M12 3.2a5.6 5.6 0 0 0-3.7 9.8c.75.7 1 1.4 1 2.3h5.4c0-.9.25-1.6 1-2.3A5.6 5.6 0 0 0 12 3.2z" />
    </>
  ),
  crescimento: (
    <>
      <path d="M3 17 9.5 10.5l4 4L21 7" />
      <path d="M15.5 7H21v5.5" />
    </>
  ),
  estrela: (
    <path d="M12 3.2l2.7 5.5 6 .9-4.35 4.25 1.03 6L12 17.02 6.62 19.85l1.03-6L3.3 9.6l6-.9z" />
  ),
  medalha: (
    <>
      <circle cx="12" cy="9" r="5.4" />
      <path d="M9 13.6 7.7 21 12 18.4 16.3 21 15 13.6" />
    </>
  ),
  elo: (
    <>
      <path d="M9.6 13.2a4.3 4.3 0 0 0 6.5.45l2.6-2.6a4.3 4.3 0 0 0-6.1-6.1l-1.5 1.5" />
      <path d="M14.4 10.8a4.3 4.3 0 0 0-6.5-.45l-2.6 2.6a4.3 4.3 0 0 0 6.1 6.1l1.5-1.5" />
    </>
  ),
  calendario: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.2" />
      <path d="M16 3v3M8 3v3M3.5 9.5h17" />
    </>
  ),
  check: (
    <>
      <path d="M21.2 11.1V12a9.2 9.2 0 1 1-5.45-8.4" />
      <path d="M21.5 4.5 12 14l-2.8-2.8" />
    </>
  ),
  aperto: (
    <>
      <path d="M9 12.5 6.5 10a2 2 0 0 1 2.8-2.8l1.7 1.7 2.5-2.3a2.4 2.4 0 0 1 3.3 0l3.2 3" />
      <path d="M3 8.5 6 5.5M13 9.5l2.5 2.5M16 12l1.8 1.8a1.6 1.6 0 0 1-2.2 2.3l-.3-.3-1.3 1.3a1.6 1.6 0 0 1-2.3-2.2" />
    </>
  ),
}

export const ICONES_CONECTA = Object.keys(PATHS)

export function ConectaIcone({
  nome,
  tamanho = 96,
  cor = COR_CIANO,
  traco = 1.7,
}: {
  nome: string
  tamanho?: number
  cor?: string
  traco?: number
}) {
  const paths = PATHS[nome]
  if (!nome || nome === 'nenhum' || !paths) return null
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={traco}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flex: 'none' }}
      aria-hidden
    >
      {paths}
    </svg>
  )
}
