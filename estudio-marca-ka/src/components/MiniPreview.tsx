import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Template } from '../templates/types'
import { valoresPadrao } from '../templates/types'

// Miniatura AO VIVO de um template: renderiza a arte real (1080px) com os
// valores padrão dos campos e reduz com transform:scale para caber no card.
// Decorativa (aria-hidden) e sem interação (pointer-events:none no CSS).
export function MiniPreview({ template }: { template: Template }) {
  const fmt = template.formatos[0]
  const ref = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const medir = () => setEscala(el.clientWidth / fmt.largura)
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fmt.largura])

  const valores = useMemo(() => valoresPadrao(template.campos), [template])
  const Render = template.render

  return (
    <div ref={ref} className="mini-preview" aria-hidden="true">
      {escala > 0 && (
        <div
          className="mini-preview__zoom"
          style={{ width: fmt.largura, height: fmt.altura, transform: `scale(${escala})` }}
        >
          <Render valores={valores} formato={fmt} />
        </div>
      )}
    </div>
  )
}
