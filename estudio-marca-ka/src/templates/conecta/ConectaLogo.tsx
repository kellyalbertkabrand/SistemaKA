// ============================================================================
// Logo do Conecta — arte OFICIAL (extraída do guia de marca do Canva):
// símbolo "C" espiral + wordmark "CONECTA" + tagline. Assets transparentes em
// public/clientes/conecta/. Cores oficiais: ciano #0CD9D2, marinho #021734.
// ============================================================================

const SIMBOLO = '/clientes/conecta/conecta-simbolo.png'
const SIMBOLO_MARINHO = '/clientes/conecta/conecta-simbolo-marinho.png'
const WORDMARK = '/clientes/conecta/conecta-wordmark.png'

const RATIO_WORDMARK = 2517 / 400 // largura/altura do PNG do wordmark

/** Só o símbolo (para cabeçalhos compactos, avatar e o padrão de fundo). */
export function ConectaSimbolo({ escuro = true, tamanho = 96 }: { escuro?: boolean; tamanho?: number }) {
  return (
    <img
      src={escuro ? SIMBOLO : SIMBOLO_MARINHO}
      alt="Conecta"
      crossOrigin="anonymous"
      style={{ width: tamanho, height: tamanho, display: 'block', flex: 'none', objectFit: 'contain' }}
    />
  )
}

/** Lockup horizontal: símbolo + CONECTA + tagline (arte oficial).
 *  O símbolo e o wordmark ficam SEMPRE no teal da marca (coerência de cor);
 *  só a tagline muda de tom conforme o fundo. */
export function ConectaLogo({ escuro = true, altura = 96 }: { escuro?: boolean; altura?: number }) {
  const hWord = altura * 0.46
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: altura * 0.16 }}>
      <ConectaSimbolo escuro tamanho={altura} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: altura * 0.08 }}>
        <img
          src={WORDMARK}
          alt="CONECTA"
          crossOrigin="anonymous"
          style={{ height: hWord, width: hWord * RATIO_WORDMARK, display: 'block', objectFit: 'contain' }}
        />
        <span
          style={{
            color: escuro ? 'rgba(255,255,255,0.9)' : 'rgba(2,23,52,0.68)',
            fontWeight: 600,
            fontSize: altura * 0.148,
            letterSpacing: '0.12em',
            whiteSpace: 'nowrap',
          }}
        >
          NÚCLEO DE NEGÓCIOS ACIGRA
        </span>
      </div>
    </div>
  )
}
