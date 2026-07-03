import type { RenderProps } from '../types'
import './shapes.css'

// Post de produto da Shapes — fundo colorido (configurável), foto do produto
// numa forma orgânica e um texto curto, no estilo do carrossel de produto.
// Campos: foto (imagem), cor de fundo (cor) e texto.
export function ShapesProdutoCard({ valores, formato }: RenderProps) {
  const cor = String(valores.cor_fundo || '#3E4A2C')
  const foto = String(valores.foto || '')
  const texto = String(valores.texto || '')

  return (
    <div
      className={`shapes-prod fmt-${formato.formato}`}
      style={{ width: formato.largura, height: formato.altura, background: cor }}
    >
      <img
        className="logo"
        src="/clientes/shapes/shapes-logo-branco.png"
        alt="Shapes"
        crossOrigin="anonymous"
      />

      <div className="foto-blob">
        {foto ? (
          <img src={foto} alt="" />
        ) : (
          <div className="foto-ph">Sua foto aqui</div>
        )}
      </div>

      {texto && <div className="texto">{texto}</div>}
    </div>
  )
}
