import { FORMAS } from '../formas'

// Definições de clip-path das formas Shapes. Renderize DENTRO de cada card que
// usa clip-path (para o export html-to-image resolver o url(#id) no clone).
//
// `uid` deixa os ids ÚNICOS por card. Sem isso, vários cards na mesma página
// (galeria de miniaturas, carrossel) repetem os mesmos ids `shape-blob1`; o
// Chrome tolera, mas o SAFARI (iPhone) não resolve ids duplicados e a foto sai
// QUADRADA em vez de na forma orgânica. Com o uid, cada card tem o seu id.
export function ShapesClips({ uid = '' }: { uid?: string }) {
  const suf = uid ? `-${uid}` : ''
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
      <defs>
        {FORMAS.map((f) => (
          <clipPath key={f.id} id={`${f.id}${suf}`} clipPathUnits="objectBoundingBox">
            <path d={f.d} />
          </clipPath>
        ))}
      </defs>
    </svg>
  )
}

// id CSS-seguro e único por instância de card (o useId do React traz ":", que
// quebra o url(#...) — removemos tudo que não for alfanumérico).
export function idsClipSeguro(bruto: string): string {
  return bruto.replace(/[^a-zA-Z0-9]/g, '')
}
