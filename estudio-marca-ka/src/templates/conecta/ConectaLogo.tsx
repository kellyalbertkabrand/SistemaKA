// ============================================================================
// Logo do Conecta — arte OFICIAL, nas variantes do Design System:
//  • branco  → cards escuros/foto (com drop-shadow)
//  • full    → cards claros (turquesa + navy)
//  • ícone   → assinatura discreta no rodapé (só o símbolo)
// Assets em public/clientes/conecta/. Nunca SVG aproximado.
// ============================================================================

const SIMBOLO = {
  turquesa: '/clientes/conecta/conecta-simbolo.png',
  branco: '/clientes/conecta/conecta-simbolo-branco.png',
  navy: '/clientes/conecta/conecta-simbolo-marinho.png',
}
const WORDMARK = {
  turquesa: '/clientes/conecta/conecta-wordmark.png',
  branco: '/clientes/conecta/conecta-wordmark-branco.png',
  navy: '/clientes/conecta/conecta-wordmark-marinho.png',
}
const RATIO_WORDMARK = 2517 / 400 // largura/altura do PNG do wordmark

/** Só o ícone (assinatura no rodapé dos slides internos). */
export function ConectaIconeAssinatura({
  escuro = true,
  tamanho = 20,
  opacidade = escuro ? 0.3 : 0.15,
}: {
  escuro?: boolean
  tamanho?: number
  opacidade?: number
}) {
  return (
    <img
      src={escuro ? SIMBOLO.branco : SIMBOLO.navy}
      alt="Conecta"
      crossOrigin="anonymous"
      style={{ height: tamanho, width: tamanho, objectFit: 'contain', opacity: opacidade, display: 'block' }}
    />
  )
}

/**
 * Lockup: símbolo + CONECTA + tagline. `cor` = 'auto' segue o fundo (branco no
 * escuro com drop-shadow; turquesa no claro); ou força 'branco'/'turquesa'/'navy'.
 */
export function ConectaLogo({
  escuro = true,
  altura = 64,
  cor = 'auto',
}: {
  escuro?: boolean
  altura?: number
  cor?: 'auto' | 'branco' | 'turquesa' | 'navy'
}) {
  const variante = cor === 'auto' ? (escuro ? 'branco' : 'turquesa') : cor
  const corSimbolo = variante
  const corWord = variante
  const corTag = variante === 'branco' ? '#FFFFFF' : variante === 'turquesa' ? '#00CEC9' : '#1B2A4A'
  const hWord = altura * 0.44
  const sombra = variante === 'branco' && escuro ? 'drop-shadow(0 2px 10px rgba(0,0,0,0.5))' : 'none'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: altura * 0.16, filter: sombra }}>
      <img
        src={SIMBOLO[corSimbolo]}
        alt="Conecta"
        crossOrigin="anonymous"
        style={{ height: altura, width: altura, objectFit: 'contain', display: 'block', flex: 'none' }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: altura * 0.08 }}>
        <img
          src={WORDMARK[corWord]}
          alt="CONECTA"
          crossOrigin="anonymous"
          style={{ height: hWord, width: hWord * RATIO_WORDMARK, objectFit: 'contain', display: 'block' }}
        />
        <span
          style={{
            color: corTag,
            opacity: escuro ? 0.92 : 0.7,
            fontWeight: 500,
            fontSize: altura * 0.135,
            letterSpacing: '0.14em',
            whiteSpace: 'nowrap',
          }}
        >
          NÚCLEO DE NEGÓCIOS ACIGRA
        </span>
      </div>
    </div>
  )
}
