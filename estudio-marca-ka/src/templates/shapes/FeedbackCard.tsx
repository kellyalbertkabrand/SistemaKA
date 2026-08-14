import type { RenderProps } from '../types'
import { logoShapes } from './cores'
import { comEnfase } from './enfase'
import './shapes.css'

const TEXTURA_LARANJA = 'url(/clientes/shapes/fundo-shapes.jpg)'

// Card de depoimento da Shapes — reprodução fiel do template-card.html oficial.
// Campos preenchidos pelo cliente: estrelas, depoimento (quote), nome (who) e
// cor de fundo (textura laranja padrão ou qualquer cor da marca).
export function ShapesFeedbackCard({ valores, formato }: RenderProps) {
  const estrelas = Math.max(0, Math.min(5, Number(valores.stars ?? 5)))
  const quote = String(valores.quote ?? '')
  const who = String(valores.who ?? '')
  const corFundo = String(valores.cor_fundo || TEXTURA_LARANJA)
  const isTextura = corFundo.startsWith('url(')
  const corFonte = String(valores.cor_fonte || '#FFFFFF')
  const logoUrl = logoShapes(String(valores.cor_logo || 'auto'), corFundo)

  return (
    <div
      className={`shapes-fb fmt-${formato.formato}`}
      style={{
        width: formato.largura,
        height: formato.altura,
        color: corFonte,
        background: isTextura
          ? `${TEXTURA_LARANJA} center / cover no-repeat, #ff7829`
          : corFundo,
      }}
    >
      <div className="content">
        <img
          className="logo"
          src={logoUrl}
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
          <div className="quote">{comEnfase(quote)}</div>
        </div>
        <div className="who">{who}</div>
      </div>
    </div>
  )
}
