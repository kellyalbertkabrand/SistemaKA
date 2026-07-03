import type { RenderProps } from '../types'
import { estiloImagem } from '../imagem'
import { ShapesClips } from './ShapesClips'
import './shapes.css'

// Post de produto da Shapes — fundo colorido (configurável), foto do produto
// numa forma orgânica e um texto curto, no estilo do carrossel de produto.
// Campos: foto (imagem), cor de fundo (cor) e texto.
export function ShapesProdutoCard({ valores, formato }: RenderProps) {
  const cor = String(valores.cor_fundo || '#3E4A2C')
  const foto = String(valores.foto || '')
  const texto = String(valores.texto || '')
  const forma = String(valores.forma || 'shape-blob1')

  return (
    <div
      className={`shapes-prod fmt-${formato.formato}`}
      style={{ width: formato.largura, height: formato.altura, background: cor }}
    >
      <ShapesClips />
      <img
        className="logo"
        src="/clientes/shapes/shapes-logo-branco.png"
        alt="Shapes"
        crossOrigin="anonymous"
      />

      <div className="foto-blob" style={{ clipPath: `url(#${forma})`, WebkitClipPath: `url(#${forma})` }}>
        {foto ? (
          <img src={foto} alt="" style={estiloImagem(valores, 'foto')} />
        ) : (
          <div className="foto-ph">Sua foto aqui</div>
        )}
      </div>

      {texto && <div className="texto">{texto}</div>}
    </div>
  )
}
