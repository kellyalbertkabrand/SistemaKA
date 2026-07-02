import type { RenderProps } from '../types'
import './shapes.css'

// Card de depoimento da Shapes — reprodução fiel do template-card.html oficial.
// Campos preenchidos pelo cliente: estrelas, depoimento (quote) e nome (who).
export function ShapesFeedbackCard({ valores, formato }: RenderProps) {
  const estrelas = Math.max(0, Math.min(5, Number(valores.stars ?? 5)))
  const quote = String(valores.quote ?? '')
  const who = String(valores.who ?? '')

  return (
    <div
      className={`shapes-fb fmt-${formato.formato}`}
      style={{ width: formato.largura, height: formato.altura }}
    >
      <img className="bg" src="/clientes/shapes/fundo-shapes.jpg" alt="" crossOrigin="anonymous" />
      <div className="content">
        <img
          className="logo"
          src="/clientes/shapes/shapes-logo-branco.png"
          alt="Shapes"
          crossOrigin="anonymous"
        />
        <div className="kicker">FEEDBACK ;)</div>
        <div className="cardbox">
          <div className="stars" aria-label={`${estrelas} de 5 estrelas`}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={i < estrelas ? 'on' : 'off'}>
                ★
              </span>
            ))}
          </div>
          <div className="quote">{quote}</div>
        </div>
        <div className="who">{who}</div>
      </div>
    </div>
  )
}
