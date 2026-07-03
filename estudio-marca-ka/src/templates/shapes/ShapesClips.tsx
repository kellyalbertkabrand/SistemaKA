import { FORMAS } from '../formas'

// Definições de clip-path das formas Shapes. Renderize DENTRO de cada card que
// usa clip-path (para o export html-to-image resolver o url(#id) no clone).
export function ShapesClips() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
      <defs>
        {FORMAS.map((f) => (
          <clipPath key={f.id} id={f.id} clipPathUnits="objectBoundingBox">
            <path d={f.d} />
          </clipPath>
        ))}
      </defs>
    </svg>
  )
}
