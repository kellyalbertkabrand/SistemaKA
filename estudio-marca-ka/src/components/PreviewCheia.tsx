import { useEffect, useState, type ReactNode } from 'react'

// Pré-visualização em TELA CHEIA: mostra o card grande, centralizado, escalado
// para caber na janela. Fecha ao clicar fora, no × ou apertando Esc.
export function PreviewCheia({
  largura,
  altura,
  rotulo,
  children,
  onFechar,
}: {
  largura: number
  altura: number
  rotulo?: string
  children: ReactNode
  onFechar: () => void
}) {
  const [win, setWin] = useState({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const ao = () => setWin({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', ao)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    // Trava o scroll do fundo enquanto está aberto.
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('resize', ao)
      window.removeEventListener('keydown', esc)
      document.body.style.overflow = antes
    }
  }, [onFechar])

  // Deixa uma margem para o × e o rótulo.
  const escala = Math.min((win.w - 32) / largura, (win.h - 96) / altura)
  const w = Math.round(largura * escala)
  const h = Math.round(altura * escala)

  return (
    <div className="preview-cheia" onClick={onFechar}>
      <button className="preview-cheia__x" onClick={onFechar} aria-label="Fechar">
        ×
      </button>
      <div className="preview-cheia__palco" style={{ width: w, height: h }} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            transform: `scale(${escala})`,
            transformOrigin: 'top left',
            width: largura,
            height: altura,
          }}
        >
          {children}
        </div>
      </div>
      {rotulo && <span className="preview-cheia__label">{rotulo}</span>}
    </div>
  )
}
