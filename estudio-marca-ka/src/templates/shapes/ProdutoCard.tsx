import type { RenderProps } from '../types'
import { estiloImagem } from '../imagem'
import { ratioForma, caixaContida } from '../formas'
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

  // caixa da foto com a proporção nativa da forma (contain), para o clip não esticar.
  const pad = 96
  const caixa = caixaContida(
    formato.largura - pad * 2,
    formato.altura - 560,
    ratioForma(forma),
  )

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

      <div className="blob-wrap">
        <div
          className="foto-blob"
          style={{
            width: caixa.largura,
            height: caixa.altura,
            clipPath: `url(#${forma})`,
            WebkitClipPath: `url(#${forma})`,
          }}
        >
          {foto ? (
            <img src={foto} alt="" style={estiloImagem(valores, 'foto')} />
          ) : (
            <div className="foto-ph">Sua foto aqui</div>
          )}
        </div>
      </div>

      {texto && <div className="texto">{texto}</div>}
    </div>
  )
}
